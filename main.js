'use strict';

const obsidian = require('obsidian');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Normalize Korean/Unicode paths to NFC so macOS (NFD) and Android/Windows (NFC) match 100%
function normPath(p) {
  return (p || '').normalize('NFC');
}

const DEFAULT_SETTINGS = {
  clientId: '202264815644.apps.googleusercontent.com',
  clientSecret: 'X4Z3ca8xfWDb1Voo-F9a7ZxJ',
  refreshToken: '',
  remoteFolderName: 'Obsidian_Archive_Vault',
  remoteRootFolderId: '',
  enableDailyAutoBackup: !obsidian.Platform.isMobile,
  dailyBackupTime: '23:00',
  backupOnStartupIfMissed: !obsidian.Platform.isMobile,
  maxMobileFileSizeMB: 25,
  includeObsidianConfig: false,
  deleteExtraneousOnPull: false,
  deleteExtraneousOnPush: false,
  lastBackupDate: '',
  lastPushTimestamp: 0,
  lastPullTimestamp: 0,
  lastStatusSummary: '아직 동기화 기록이 없습니다.'
};

class ObsidianDriveKeeperPlugin extends obsidian.Plugin {
  async onload() {
    await this.loadSettings();
    this.isSyncing = false;
    this.accessToken = '';
    this.accessTokenExpiry = 0;
    this.logs = [];

    this.addRibbonIcon('cloud', 'Drive Vault Keeper 열기', () => {
      new DriveKeeperModal(this.app, this).open();
    });

    if (!obsidian.Platform.isMobile) {
      this.statusBarItem = this.addStatusBarItem();
      this.updateStatusBar('☁️ Drive 대기 중');
      this.statusBarItem.onClickEvent(() => {
        new DriveKeeperModal(this.app, this).open();
      });
    }

    this.addCommand({
      id: 'open-drive-keeper-dashboard',
      name: '대시보드 열기 (업로드 / 동기화 관리)',
      callback: () => new DriveKeeperModal(this.app, this).open()
    });

    this.addCommand({
      id: 'push-vault-to-google-drive',
      name: '☁️ 지금 구글 드라이브에 모셔두기 (원본 그대로 업로드 / Push)',
      callback: () => this.runPushBackup(false)
    });

    this.addCommand({
      id: 'pull-vault-from-google-drive',
      name: '📥 지금 구글 드라이브에서 그대로 동기화받기 (내려받기 / Pull)',
      callback: () => this.runPullRestore()
    });

    this.addSettingTab(new DriveKeeperSettingTab(this.app, this));

    this.registerInterval(
      window.setInterval(() => this.checkDailySchedule(), 60 * 1000)
    );

    window.setTimeout(() => {
      if (!obsidian.Platform.isMobile && this.settings.enableDailyAutoBackup && this.settings.backupOnStartupIfMissed) {
        this.checkDailySchedule(true);
      }
    }, 15000);
  }

  updateStatusBar(text) {
    if (this.statusBarItem) {
      this.statusBarItem.setText(text);
    }
  }

  addLog(msg) {
    const timeStr = new Date().toLocaleTimeString();
    const line = `[${timeStr}] ${msg}`;
    this.logs.unshift(line);
    if (this.logs.length > 80) this.logs.pop();
    if (this.onLogUpdate) this.onLogUpdate(this.logs);
  }

  isConfigured() {
    return Boolean(
      this.settings.clientId.trim() &&
      this.settings.clientSecret.trim() &&
      this.settings.refreshToken.trim()
    );
  }

  getTodayDateString() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  async checkDailySchedule(isStartupCheck = false) {
    if (obsidian.Platform.isMobile) return;
    if (!this.settings.enableDailyAutoBackup || !this.isConfigured() || this.isSyncing) {
      return;
    }

    const today = this.getTodayDateString();
    if (this.settings.lastBackupDate === today) {
      return;
    }

    const now = new Date();
    const [targetHour, targetMin] = (this.settings.dailyBackupTime || '23:00')
      .split(':')
      .map((n) => parseInt(n, 10));

    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const targetMinutes = (targetHour || 23) * 60 + (targetMin || 0);

    if (currentMinutes >= targetMinutes || (isStartupCheck && this.settings.lastBackupDate !== today)) {
      this.addLog('⏰ 일일 자동 백업 조건 충족 -> 구글 드라이브 업로드를 시작합니다.');
      await this.runPushBackup(true);
    }
  }

  // ==========================================================================
  // Native Fetch Layer with Exponential Backoff
  // Using native fetch instead of obsidian.requestUrl avoids Capacitor bridge
  // Base64 serialization overhead that causes mobile WebView OOM crashes!
  // ==========================================================================
  async fetchWithRetry(url, options = {}, maxRetries = 8) {
    let attempt = 0;
    while (true) {
      try {
        const resp = await window.fetch(url, options);
        if (resp.ok) return resp;
        if ((resp.status === 403 || resp.status === 429 || resp.status >= 500) && attempt < maxRetries) {
          attempt++;
          const waitMs = Math.min(12000, 900 * Math.pow(1.7, attempt) + Math.floor(Math.random() * 500));
          await sleep(waitMs);
          continue;
        }
        return resp;
      } catch (netErr) {
        if (attempt < maxRetries) {
          attempt++;
          await sleep(1500 * attempt);
          continue;
        }
        throw netErr;
      }
    }
  }

  async getValidAccessToken() {
    if (this.accessToken && Date.now() < this.accessTokenExpiry - 60000) {
      return this.accessToken;
    }
    if (!this.isConfigured()) {
      throw new Error('Google Drive 연결 설정이 완료되지 않았습니다.');
    }

    const body = new URLSearchParams({
      client_id: this.settings.clientId.trim(),
      client_secret: this.settings.clientSecret.trim(),
      refresh_token: this.settings.refreshToken.trim(),
      grant_type: 'refresh_token'
    }).toString();

    const resp = await this.fetchWithRetry('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    });

    const data = await resp.json();
    if (!resp.ok || !data || !data.access_token) {
      throw new Error(`Google 액세스 토큰 갱신 실패: HTTP ${resp.status}`);
    }

    this.accessToken = data.access_token;
    this.accessTokenExpiry = Date.now() + (data.expires_in || 3600) * 1000;
    return this.accessToken;
  }

  async driveJsonRequest(url, options = {}) {
    const token = await this.getValidAccessToken();
    const headers = Object.assign({}, options.headers || {}, {
      Authorization: `Bearer ${token}`
    });
    const resp = await this.fetchWithRetry(url, Object.assign({}, options, { headers }));
    if (!resp.ok) {
      const errText = await resp.text().catch(() => '');
      throw new Error(`Drive API 오류 (HTTP ${resp.status}): ${errText.slice(0, 180)}`);
    }
    return resp.json();
  }

  async ensureRemoteRootFolder() {
    if (this.settings.remoteRootFolderId) {
      try {
        const token = await this.getValidAccessToken();
        const checkResp = await this.fetchWithRetry(
          `https://www.googleapis.com/drive/v3/files/${this.settings.remoteRootFolderId}?fields=id,name,trashed`,
          { headers: { Authorization: `Bearer ${token}` } },
          3
        );
        if (checkResp.ok) {
          const meta = await checkResp.json();
          if (meta && !meta.trashed) {
            return this.settings.remoteRootFolderId;
          }
        }
      } catch {}
    }

    const folderName = (this.settings.remoteFolderName || 'Obsidian_Archive_Vault').replace(/'/g, "\\'");
    const q = encodeURIComponent(
      `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and 'root' in parents and trashed = false`
    );
    const searchData = await this.driveJsonRequest(
      `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)&spaces=drive`
    );

    if (searchData.files && searchData.files.length > 0) {
      this.settings.remoteRootFolderId = searchData.files[0].id;
      await this.saveSettings();
      return this.settings.remoteRootFolderId;
    }

    const createData = await this.driveJsonRequest('https://www.googleapis.com/drive/v3/files?fields=id', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: this.settings.remoteFolderName || 'Obsidian_Archive_Vault',
        mimeType: 'application/vnd.google-apps.folder',
        parents: ['root']
      })
    });

    this.settings.remoteRootFolderId = createData.id;
    await this.saveSettings();
    return this.settings.remoteRootFolderId;
  }

  async buildRemoteTree(rootFolderId) {
    const foldersByPath = new Map();
    const filesByPath = new Map();
    foldersByPath.set('', rootFolderId);

    const queue = [{ id: rootFolderId, pathPrefix: '' }];

    while (queue.length > 0) {
      const currentFolder = queue.shift();
      let pageToken = '';
      do {
        const q = encodeURIComponent(`'${currentFolder.id}' in parents and trashed = false`);
        const url = `https://www.googleapis.com/drive/v3/files?q=${q}&pageSize=1000&fields=nextPageToken,files(id,name,mimeType,size,modifiedTime)&pageToken=${pageToken}`;
        const data = await this.driveJsonRequest(url);
        const files = (data && data.files) || [];
        for (const item of files) {
          const cleanName = normPath(item.name);
          const relPath = normPath(currentFolder.pathPrefix ? `${currentFolder.pathPrefix}/${cleanName}` : cleanName);
          if (item.mimeType === 'application/vnd.google-apps.folder') {
            foldersByPath.set(relPath, item.id);
            queue.push({ id: item.id, pathPrefix: relPath });
          } else {
            filesByPath.set(relPath, {
              id: item.id,
              name: cleanName,
              size: Number(item.size || 0),
              modifiedTime: item.modifiedTime ? new Date(item.modifiedTime).getTime() : 0,
              parentId: currentFolder.id
            });
          }
        }
        pageToken = (data && data.nextPageToken) || '';
      } while (pageToken);
    }

    return { foldersByPath, filesByPath };
  }

  async ensureRemoteSubfolder(relFolderPath, foldersByPath) {
    const normFolder = normPath(relFolderPath);
    if (!normFolder) return foldersByPath.get('');
    if (foldersByPath.has(normFolder)) return foldersByPath.get(normFolder);

    const parts = normFolder.split('/');
    let currentPath = '';
    let parentId = foldersByPath.get('');

    for (const part of parts) {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      if (foldersByPath.has(currentPath)) {
        parentId = foldersByPath.get(currentPath);
      } else {
        const created = await this.driveJsonRequest('https://www.googleapis.com/drive/v3/files?fields=id', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: part,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [parentId]
          })
        });
        parentId = created.id;
        foldersByPath.set(currentPath, parentId);
      }
    }
    return parentId;
  }

  // Upload binary file using native window.fetch (bypasses Capacitor bridge crash!)
  async uploadBinaryFile(relPath, arrayBuffer, parentFolderId, existingFileId = null) {
    const fileName = normPath(relPath.split('/').pop());
    const metadata = existingFileId
      ? { name: fileName }
      : { name: fileName, parents: [parentFolderId] };

    const initUrl = existingFileId
      ? `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=resumable`
      : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable';

    const initMethod = existingFileId ? 'PATCH' : 'POST';
    const token = await this.getValidAccessToken();

    const initResp = await this.fetchWithRetry(initUrl, {
      method: initMethod,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Type': 'application/octet-stream',
        'X-Upload-Content-Length': String(arrayBuffer.byteLength)
      },
      body: JSON.stringify(metadata)
    });

    if (!initResp.ok) {
      const errTxt = await initResp.text().catch(() => '');
      throw new Error(`업로드 세션 생성 실패 (${relPath}): HTTP ${initResp.status} ${errTxt.slice(0, 120)}`);
    }

    const uploadLocation = initResp.headers.get('location');
    if (!uploadLocation) {
      throw new Error(`Resumable 업로드 URL 수신 실패: ${relPath}`);
    }

    const putResp = await this.fetchWithRetry(uploadLocation, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/octet-stream'
      },
      body: new Blob([arrayBuffer])
    });

    if (!putResp.ok) {
      throw new Error(`파일 업로드 실패 (${relPath}): HTTP ${putResp.status}`);
    }
  }

  // Download binary file using native window.fetch (bypasses Capacitor bridge crash!)
  async downloadBinaryFile(fileId) {
    const token = await this.getValidAccessToken();
    const resp = await this.fetchWithRetry(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );
    if (!resp.ok) {
      throw new Error(`파일 다운로드 실패 (${fileId}): HTTP ${resp.status}`);
    }
    return resp.arrayBuffer();
  }

  shouldIgnorePath(relPath) {
    const norm = normPath(relPath);
    const name = norm.split('/').pop();
    if (name === '.DS_Store' || name === 'Thumbs.db' || name === 'desktop.ini') {
      return true;
    }
    if (norm.startsWith('.git/') || norm === '.git') {
      return true;
    }
    if (!this.settings.includeObsidianConfig) {
      const configDir = this.app.vault.configDir || '.obsidian';
      if (norm === configDir || norm.startsWith(`${configDir}/`)) {
        return true;
      }
    } else {
      const ownDataPath = `${this.app.vault.configDir}/plugins/${this.manifest.id}/data.json`;
      if (norm === ownDataPath || norm.endsWith('drive-keeper/data.json')) return true;
    }
    return false;
  }

  async listAllLocalFiles() {
    const adapter = this.app.vault.adapter;
    const allFiles = [];
    const queue = [''];

    while (queue.length > 0) {
      const currentDir = queue.shift();
      const listed = await adapter.list(currentDir);

      for (const folder of listed.folders) {
        if (!this.shouldIgnorePath(folder)) {
          queue.push(folder);
        }
      }

      for (const file of listed.files) {
        if (!this.shouldIgnorePath(file)) {
          const stat = await adapter.stat(file);
          allFiles.push({
            rawPath: file,              // exact path on current OS filesystem (NFD on Mac, NFC on Android)
            normRelPath: normPath(file), // normalized NFC key for cross-platform comparison
            size: stat ? stat.size : 0,
            mtime: stat ? stat.mtime : 0
          });
        }
      }
    }
    return allFiles;
  }

  async ensureLocalParentDirs(relFilePath) {
    const parts = relFilePath.split('/');
    parts.pop();
    if (parts.length === 0) return;

    const adapter = this.app.vault.adapter;
    let current = '';
    for (const part of parts) {
      current = current ? `${current}/${part}` : part;
      const exists = await adapter.exists(current);
      if (!exists) {
        await adapter.mkdir(current);
      }
    }
  }

  // ==========================================================================
  // Zero-Memory Comparison Push & Pull
  // Never calls adapter.readBinary() just to compare files!
  // Matches by NFC normalized path + exact byte size (and mtime for edited notes).
  // ==========================================================================
  async runPushBackup(isSilentAuto = false, progressCallback = null) {
    if (this.isSyncing) {
      new obsidian.Notice('이미 동기화 작업이 진행 중입니다.');
      return;
    }
    if (!this.isConfigured()) {
      new obsidian.Notice('먼저 플러그인 설정에서 Google Drive 계정을 연결해주세요.');
      return;
    }

    this.isSyncing = true;
    this.updateStatusBar('☁️ Drive 업로드 중...');
    if (!isSilentAuto) {
      new obsidian.Notice('☁️ 구글 드라이브에 아카이브 업로드를 시작합니다...');
    }
    this.addLog('🚀 [업로드 / Push] 파일 목록 비교 중...');

    try {
      const rootFolderId = await this.ensureRemoteRootFolder();
      const [localFiles, remoteTree] = await Promise.all([
        this.listAllLocalFiles(),
        this.buildRemoteTree(rootFolderId)
      ]);

      const { foldersByPath, filesByPath } = remoteTree;
      this.addLog(`📂 스캔 완료: 로컬 ${localFiles.length}개 / 구글 드라이브 ${filesByPath.size}개`);

      let uploadedCount = 0;
      let skippedCount = 0;
      const total = localFiles.length;
      const mobileMaxBytes = (this.settings.maxMobileFileSizeMB || 25) * 1024 * 1024;

      for (let i = 0; i < total; i++) {
        const localFile = localFiles[i];
        const remoteFile = filesByPath.get(localFile.normRelPath);

        // Zero-RAM comparison: if file exists on Drive with identical byte size
        // (and for small markdown notes, hasn't been modified after remote upload), skip without reading!
        if (remoteFile && remoteFile.size === localFile.size) {
          const isSmallText = localFile.size < 256 * 1024 && localFile.normRelPath.endsWith('.md');
          if (!isSmallText || localFile.mtime <= remoteFile.modifiedTime + 5000) {
            skippedCount++;
            if (i % 40 === 0 && progressCallback) {
              progressCallback(i + 1, total, `비교 건너뜀 (${i + 1}/${total}): ${localFile.normRelPath}`);
            }
            continue;
          }
        }

        if (obsidian.Platform.isMobile && localFile.size > mobileMaxBytes) {
          const sizeMB = Math.round(localFile.size / (1024 * 1024));
          this.addLog(`⚠️ 태블릿 메모리 보호 (${sizeMB}MB 대용량 건너뜀): ${localFile.normRelPath}`);
          skippedCount++;
          continue;
        }

        if (progressCallback) {
          progressCallback(i + 1, total, `업로드 중 (${i + 1}/${total}): ${localFile.normRelPath}`);
        }

        const parentRelPath = localFile.normRelPath.includes('/')
          ? localFile.normRelPath.substring(0, localFile.normRelPath.lastIndexOf('/'))
          : '';
        const parentFolderId = await this.ensureRemoteSubfolder(parentRelPath, foldersByPath);

        let buffer = await this.app.vault.adapter.readBinary(localFile.rawPath);
        await this.uploadBinaryFile(
          localFile.normRelPath,
          buffer,
          parentFolderId,
          remoteFile ? remoteFile.id : null
        );
        buffer = null;
        uploadedCount++;
        this.addLog(`✅ 업로드 완료: ${localFile.normRelPath}`);

        if (obsidian.Platform.isMobile) {
          await sleep(120);
        }
      }

      this.settings.lastBackupDate = this.getTodayDateString();
      this.settings.lastPushTimestamp = Date.now();
      this.settings.lastStatusSummary = `최근 업로드: ${new Date().toLocaleString()} (업로드 ${uploadedCount}개, 동일 유지 ${skippedCount}개)`;
      await this.saveSettings();

      this.addLog(`🎉 업로드 완료! (새로 올림: ${uploadedCount}개, 동일 파일 유지: ${skippedCount}개)`);
      this.updateStatusBar('☁️ Drive 백업 완료');
      new obsidian.Notice(`✅ 구글 드라이브 업로드 완료! (업로드 ${uploadedCount}개 / 유지 ${skippedCount}개)`);
    } catch (err) {
      console.error(err);
      this.addLog(`❌ 오류 발생: ${err.message}`);
      this.updateStatusBar('⚠️ Drive 오류');
      new obsidian.Notice(`❌ 구글 드라이브 업로드 실패: ${err.message}`);
    } finally {
      this.isSyncing = false;
      if (progressCallback) progressCallback(1, 1, '대기 중', true);
    }
  }

  async runPullRestore(progressCallback = null) {
    if (this.isSyncing) {
      new obsidian.Notice('이미 동기화 작업이 진행 중입니다.');
      return;
    }
    if (!this.isConfigured()) {
      new obsidian.Notice('먼저 플러그인 설정에서 Google Drive 계정을 연결해주세요.');
      return;
    }

    this.isSyncing = true;
    this.updateStatusBar('📥 Drive 동기화 중...');
    new obsidian.Notice('📥 구글 드라이브에서 아카이브 동기화(내려받기)를 시작합니다...');
    this.addLog('🚀 [동기화 내려받기 / Pull] 파일 목록 비교 중...');

    try {
      const rootFolderId = await this.ensureRemoteRootFolder();
      const [localFiles, remoteTree] = await Promise.all([
        this.listAllLocalFiles(),
        this.buildRemoteTree(rootFolderId)
      ]);

      const { filesByPath } = remoteTree;
      const localByNormPath = new Map();
      for (const lf of localFiles) {
        localByNormPath.set(lf.normRelPath, lf);
      }

      const remoteEntries = Array.from(filesByPath.entries()).filter(
        ([relPath]) => !this.shouldIgnorePath(relPath)
      );

      this.addLog(`📂 원격 파일 ${remoteEntries.length}개 / 로컬 파일 ${localFiles.length}개 비교 시작...`);

      let downloadedCount = 0;
      let skippedCount = 0;
      const total = remoteEntries.length;
      const adapter = this.app.vault.adapter;
      const mobileMaxBytes = (this.settings.maxMobileFileSizeMB || 25) * 1024 * 1024;

      for (let i = 0; i < total; i++) {
        const [normRelPath, remoteFile] = remoteEntries[i];
        const existingLocal = localByNormPath.get(normRelPath);

        // Zero-RAM check: if local file already exists with identical byte size, skip immediately!
        if (existingLocal && existingLocal.size === remoteFile.size) {
          skippedCount++;
          if (i % 40 === 0 && progressCallback) {
            progressCallback(i + 1, total, `동일 파일 유지 (${i + 1}/${total}): ${normRelPath}`);
          }
          continue;
        }

        if (obsidian.Platform.isMobile && remoteFile.size > mobileMaxBytes) {
          const sizeMB = Math.round(remoteFile.size / (1024 * 1024));
          this.addLog(`⚠️ 태블릿 메모리 보호 (${sizeMB}MB 대용량 파일 건너뜀): ${normRelPath}`);
          skippedCount++;
          continue;
        }

        if (progressCallback) {
          progressCallback(i + 1, total, `다운로드 중 (${i + 1}/${total}): ${normRelPath}`);
        }

        const targetWritePath = existingLocal ? existingLocal.rawPath : normRelPath;
        let fileBuffer = await this.downloadBinaryFile(remoteFile.id);
        await this.ensureLocalParentDirs(targetWritePath);
        await adapter.writeBinary(targetWritePath, fileBuffer);
        fileBuffer = null;
        downloadedCount++;
        this.addLog(`📥 내려받기 완료: ${normRelPath}`);

        if (obsidian.Platform.isMobile) {
          await sleep(120);
        }
      }

      let deletedCount = 0;
      if (this.settings.deleteExtraneousOnPull) {
        for (const lf of localFiles) {
          if (!filesByPath.has(lf.normRelPath)) {
            await adapter.remove(lf.rawPath);
            deletedCount++;
            this.addLog(`🗑️ 원격에 없는 로컬 파일 정리: ${lf.normRelPath}`);
          }
        }
      }

      this.settings.lastPullTimestamp = Date.now();
      this.settings.lastStatusSummary = `최근 동기화(Pull): ${new Date().toLocaleString()} (다운로드 ${downloadedCount}개, 동일 유지 ${skippedCount}개)`;
      await this.saveSettings();

      this.addLog(`🎉 동기화 완료! (내려받음: ${downloadedCount}개, 변경 없음: ${skippedCount}개, 삭제: ${deletedCount}개)`);
      this.updateStatusBar('☁️ Drive 동기화됨');
      new obsidian.Notice(`✅ 구글 드라이브 동기화 완료! (다운로드 ${downloadedCount}개 / 유지 ${skippedCount}개)`);
    } catch (err) {
      console.error(err);
      this.addLog(`❌ 오류 발생: ${err.message}`);
      this.updateStatusBar('⚠️ Drive 오류');
      new obsidian.Notice(`❌ 구글 드라이브 동기화 실패: ${err.message}`);
    } finally {
      this.isSyncing = false;
      if (progressCallback) progressCallback(1, 1, '대기 중', true);
    }
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    if (obsidian.Platform.isMobile) {
      this.settings.backupOnStartupIfMissed = false;
      this.settings.enableDailyAutoBackup = false;
      if (!this.settings.maxMobileFileSizeMB || this.settings.maxMobileFileSizeMB > 30) {
        this.settings.maxMobileFileSizeMB = 25;
      }
    }
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}

class DriveKeeperModal extends obsidian.Modal {
  constructor(app, plugin) {
    super(app);
    this.plugin = plugin;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('odk-modal-container');

    const header = contentEl.createDiv({ cls: 'odk-hero-header' });
    header.createDiv({ cls: 'odk-hero-title', text: '☁️ Drive Vault Keeper (v1.0.3)' });

    const connected = this.plugin.isConfigured();
    header.createSpan({
      cls: `odk-badge ${connected ? 'odk-badge-connected' : 'odk-badge-disconnected'}`,
      text: connected ? 'Google Drive 연결됨' : '계정 연결 필요'
    });

    const statusCard = contentEl.createDiv({ cls: 'odk-status-card' });
    this.addStatusRow(statusCard, '구글 드라이브 폴더', `/${this.plugin.settings.remoteFolderName}`);
    this.addStatusRow(
      statusCard,
      '하루 1번 자동 업로드',
      this.plugin.settings.enableDailyAutoBackup && !obsidian.Platform.isMobile
        ? `켜짐 (매일 ${this.plugin.settings.dailyBackupTime})`
        : '꺼짐 (수동 명령 전용)'
    );
    this.addStatusRow(statusCard, '오늘 자동 백업 여부', this.plugin.settings.lastBackupDate || '기록 없음');
    this.addStatusRow(statusCard, '최근 작업 요약', this.plugin.settings.lastStatusSummary);

    const progressWrapper = contentEl.createDiv({ cls: 'odk-progress-wrapper' });
    const progressBg = progressWrapper.createDiv({ cls: 'odk-progress-bar-bg' });
    const progressFill = progressBg.createDiv({ cls: 'odk-progress-bar-fill' });
    const progressText = progressWrapper.createDiv({ cls: 'odk-progress-text', text: '준비 중...' });

    const updateProgress = (current, total, label, done = false) => {
      if (done) {
        progressWrapper.removeClass('is-active');
        return;
      }
      progressWrapper.addClass('is-active');
      const pct = total > 0 ? Math.round((current / total) * 100) : 0;
      progressFill.style.width = `${pct}%`;
      progressText.setText(`${label}`);
    };

    const grid = contentEl.createDiv({ cls: 'odk-action-grid' });

    const pullBtn = grid.createEl('button', { cls: 'odk-action-btn odk-primary' });
    pullBtn.createDiv({ cls: 'odk-btn-title', text: '📥 구글 드라이브에서 동기화받기 (Pull)' });
    pullBtn.createDiv({
      cls: 'odk-btn-desc',
      text: '구글 드라이브에 보관된 아카이브 중 새로 추가/변경된 파일만 현재 기기로 빠르게 내려받습니다.'
    });
    pullBtn.addEventListener('click', async () => {
      await this.plugin.runPullRestore(updateProgress);
      this.onOpen();
    });

    const pushBtn = grid.createEl('button', { cls: 'odk-action-btn' });
    pushBtn.createDiv({ cls: 'odk-btn-title', text: '☁️ 이 기기에서 구글 드라이브로 올리기 (Push)' });
    pushBtn.createDiv({
      cls: 'odk-btn-desc',
      text: '이 기기에서 새로 작성하거나 수정한 파일을 구글 드라이브에 업로드합니다.'
    });
    pushBtn.addEventListener('click', async () => {
      await this.plugin.runPushBackup(false, updateProgress);
      this.onOpen();
    });

    contentEl.createEl('h4', { text: '실시간 작업 로그' });
    const logBox = contentEl.createDiv({ cls: 'odk-log-box' });
    const renderLogs = (logs) => {
      logBox.setText(logs.length ? logs.join('\n') : '아직 실행된 작업 로그가 없습니다.');
    };
    renderLogs(this.plugin.logs);
    this.plugin.onLogUpdate = renderLogs;
  }

  addStatusRow(parent, label, value) {
    const row = parent.createDiv({ cls: 'odk-status-row' });
    row.createSpan({ cls: 'odk-status-label', text: label });
    row.createSpan({ cls: 'odk-status-value', text: value });
  }

  onClose() {
    this.plugin.onLogUpdate = null;
    this.contentEl.empty();
  }
}

class DriveKeeperSettingTab extends obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl('h2', { text: '☁️ Drive Vault Keeper 설정 (v1.0.3)' });

    new obsidian.Setting(containerEl)
      .setName('Google OAuth Client ID')
      .setDesc('기본 내장 자격증명이 설정되어 있습니다.')
      .addText((text) =>
        text
          .setValue(this.plugin.settings.clientId)
          .onChange(async (value) => {
            this.plugin.settings.clientId = value.trim();
            await this.plugin.saveSettings();
          })
      );

    new obsidian.Setting(containerEl)
      .setName('Google OAuth Client Secret')
      .setDesc('기본 내장 자격증명이 설정되어 있습니다.')
      .addText((text) =>
        text
          .setValue(this.plugin.settings.clientSecret)
          .onChange(async (value) => {
            this.plugin.settings.clientSecret = value.trim();
            await this.plugin.saveSettings();
          })
      );

    new obsidian.Setting(containerEl)
      .setName('Refresh Token')
      .setDesc('발급된 Google Drive Refresh Token (다른 기기에 그대로 복사해 사용 가능)')
      .addText((text) =>
        text
          .setValue(this.plugin.settings.refreshToken)
          .onChange(async (value) => {
            this.plugin.settings.refreshToken = value.trim();
            await this.plugin.saveSettings();
          })
      );

    new obsidian.Setting(containerEl)
      .setName('구글 드라이브 보관 폴더 이름')
      .addText((text) =>
        text
          .setValue(this.plugin.settings.remoteFolderName)
          .onChange(async (value) => {
            this.plugin.settings.remoteFolderName = value.trim() || 'Obsidian_Archive_Vault';
            this.plugin.settings.remoteRootFolderId = '';
            await this.plugin.saveSettings();
          })
      );

    new obsidian.Setting(containerEl)
      .setName('모바일/태블릿 단일 파일 최대 크기 제한 (MB)')
      .setDesc('태블릿 앱 메모리 보호를 위해 이 용량을 넘는 대용량 PDF는 태블릿에서 건너뜁니다. (기본: 25MB)')
      .addText((text) =>
        text
          .setValue(String(this.plugin.settings.maxMobileFileSizeMB || 25))
          .onChange(async (value) => {
            const num = parseInt(value, 10);
            this.plugin.settings.maxMobileFileSizeMB = isNaN(num) ? 25 : num;
            await this.plugin.saveSettings();
          })
      );

    new obsidian.Setting(containerEl)
      .setName('이 기기에서 하루 1번 자동 업로드 사용 (데스크톱 전용)')
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.enableDailyAutoBackup).onChange(async (value) => {
          this.plugin.settings.enableDailyAutoBackup = value;
          await this.plugin.saveSettings();
        })
      );

    new obsidian.Setting(containerEl)
      .setName('일일 자동 업로드 시각 (24시간 형식)')
      .addText((text) =>
        text
          .setValue(this.plugin.settings.dailyBackupTime)
          .onChange(async (value) => {
            this.plugin.settings.dailyBackupTime = value.trim() || '23:00';
            await this.plugin.saveSettings();
          })
      );

    new obsidian.Setting(containerEl)
      .setName('옵시디언 설정 폴더(.obsidian)도 함께 보관/동기화')
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.includeObsidianConfig).onChange(async (value) => {
          this.plugin.settings.includeObsidianConfig = value;
          await this.plugin.saveSettings();
        })
      );

    new obsidian.Setting(containerEl)
      .setName('내려받기(Pull) 시 원격에 없는 로컬 파일 정리 (완전 1:1 미러링)')
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.deleteExtraneousOnPull).onChange(async (value) => {
          this.plugin.settings.deleteExtraneousOnPull = value;
          await this.plugin.saveSettings();
        })
      );
  }
}

module.exports = ObsidianDriveKeeperPlugin;
