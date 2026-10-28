'use strict';

const obsidian = require('obsidian');

// ============================================================================
// Zero-Allocation Streaming MD5 (Uses only a fixed 64-byte scratch buffer!)
// Prevents Out-Of-Memory (OOM) crashes on Android / iPad tablets.
// ============================================================================
function md5ArrayBuffer(buffer) {
  const bytes = new Uint8Array(buffer);
  const len = bytes.length;

  function add32(a, b) {
    return (a + b) | 0;
  }
  function rol(x, c) {
    return (x << c) | (x >>> (32 - c));
  }
  function cmn(q, a, b, x, s, t) {
    a = add32(add32(a, q), add32(x, t));
    return add32(rol(a, s), b);
  }
  function ff(a, b, c, d, x, s, t) {
    return cmn((b & c) | (~b & d), a, b, x, s, t);
  }
  function gg(a, b, c, d, x, s, t) {
    return cmn((b & d) | (c & ~d), a, b, x, s, t);
  }
  function hh(a, b, c, d, x, s, t) {
    return cmn(b ^ c ^ d, a, b, x, s, t);
  }
  function ii(a, b, c, d, x, s, t) {
    return cmn(c ^ (b | ~d), a, b, x, s, t);
  }

  let a = 0x67452301;
  let b = 0xefcdab89;
  let c = 0x98badcfe;
  let d = 0x10325476;

  // Fixed 16-word (64-byte) block — zero heap growth regardless of file size
  const M = new Int32Array(16);

  function processBlock() {
    const AA = a, BB = b, CC = c, DD = d;
    a = ff(a, b, c, d, M[0], 7, -680876936);
    d = ff(d, a, b, c, M[1], 12, -389564586);
    c = ff(c, d, a, b, M[2], 17, 606105819);
    b = ff(b, c, d, a, M[3], 22, -1044525330);
    a = ff(a, b, c, d, M[4], 7, -176418897);
    d = ff(d, a, b, c, M[5], 12, 1200080426);
    c = ff(c, d, a, b, M[6], 17, -1473231341);
    b = ff(b, c, d, a, M[7], 22, -45705983);
    a = ff(a, b, c, d, M[8], 7, 1770035416);
    d = ff(d, a, b, c, M[9], 12, -1958414417);
    c = ff(c, d, a, b, M[10], 17, -42063);
    b = ff(b, c, d, a, M[11], 22, -1990404162);
    a = ff(a, b, c, d, M[12], 7, 1804603682);
    d = ff(d, a, b, c, M[13], 12, -40341101);
    c = ff(c, d, a, b, M[14], 17, -1502002290);
    b = ff(b, c, d, a, M[15], 22, 1236535329);

    a = gg(a, b, c, d, M[1], 5, -165796510);
    d = gg(d, a, b, c, M[6], 9, -1069501632);
    c = gg(c, d, a, b, M[11], 14, 643717713);
    b = gg(b, c, d, a, M[0], 20, -373897302);
    a = gg(a, b, c, d, M[5], 5, -701558691);
    d = gg(d, a, b, c, M[10], 9, 38016083);
    c = gg(c, d, a, b, M[15], 14, -660478335);
    b = gg(b, c, d, a, M[4], 20, -405537848);
    a = gg(a, b, c, d, M[9], 5, 568446438);
    d = gg(d, a, b, c, M[14], 9, -1019803690);
    c = gg(c, d, a, b, M[3], 14, -187363961);
    b = gg(b, c, d, a, M[8], 20, 1163531501);
    a = gg(a, b, c, d, M[13], 5, -1444681467);
    d = gg(d, a, b, c, M[2], 9, -51403784);
    c = gg(c, d, a, b, M[7], 14, 1735328473);
    b = gg(b, c, d, a, M[12], 20, -1926607734);

    a = hh(a, b, c, d, M[5], 4, -378558);
    d = hh(d, a, b, c, M[8], 11, -2022574463);
    c = hh(c, d, a, b, M[11], 16, 1839030562);
    b = hh(b, c, d, a, M[14], 23, -35309556);
    a = hh(a, b, c, d, M[1], 4, -1530992060);
    d = hh(d, a, b, c, M[4], 11, 1272893353);
    c = hh(c, d, a, b, M[7], 16, -155497632);
    b = hh(b, c, d, a, M[10], 23, -1094730640);
    a = hh(a, b, c, d, M[13], 4, 681279174);
    d = hh(d, a, b, c, M[0], 11, -358537222);
    c = hh(c, d, a, b, M[3], 16, -722521979);
    b = hh(b, c, d, a, M[6], 23, 76029189);
    a = hh(a, b, c, d, M[9], 4, -640364487);
    d = hh(d, a, b, c, M[12], 11, -421815835);
    c = hh(c, d, a, b, M[15], 16, 530742520);
    b = hh(b, c, d, a, M[2], 23, -995338651);

    a = ii(a, b, c, d, M[0], 6, -198630844);
    d = ii(d, a, b, c, M[7], 10, 1126891415);
    c = ii(c, d, a, b, M[14], 15, -1416354905);
    b = ii(b, c, d, a, M[5], 21, -57434055);
    a = ii(a, b, c, d, M[12], 6, 1700485571);
    d = ii(d, a, b, c, M[3], 10, -1894986606);
    c = ii(c, d, a, b, M[10], 15, -1051523);
    b = ii(b, c, d, a, M[1], 21, -2054922799);
    a = ii(a, b, c, d, M[8], 6, 1873313359);
    d = ii(d, a, b, c, M[15], 10, -30611744);
    c = ii(c, d, a, b, M[6], 15, -1560198380);
    b = ii(b, c, d, a, M[13], 21, 1309151649);
    a = ii(a, b, c, d, M[4], 6, -145523070);
    d = ii(d, a, b, c, M[11], 10, -1120210379);
    c = ii(c, d, a, b, M[2], 15, 718787259);
    b = ii(b, c, d, a, M[9], 21, -343485551);

    a = add32(a, AA);
    b = add32(b, BB);
    c = add32(c, CC);
    d = add32(d, DD);
  }

  let offset = 0;
  for (; offset + 64 <= len; offset += 64) {
    for (let j = 0; j < 16; j++) {
      const idx = offset + j * 4;
      M[j] =
        bytes[idx] |
        (bytes[idx + 1] << 8) |
        (bytes[idx + 2] << 16) |
        (bytes[idx + 3] << 24);
    }
    processBlock();
  }

  // Final padding block(s)
  const tail = new Uint8Array(128);
  const rem = len - offset;
  for (let i = 0; i < rem; i++) {
    tail[i] = bytes[offset + i];
  }
  tail[rem] = 0x80;

  const totalBlocks = rem >= 56 ? 2 : 1;
  const bitLenLow = (len << 3) >>> 0;
  const bitLenHigh = (len >>> 29) >>> 0;
  const lenOffset = totalBlocks * 64 - 8;
  tail[lenOffset] = bitLenLow & 0xff;
  tail[lenOffset + 1] = (bitLenLow >>> 8) & 0xff;
  tail[lenOffset + 2] = (bitLenLow >>> 16) & 0xff;
  tail[lenOffset + 3] = (bitLenLow >>> 24) & 0xff;
  tail[lenOffset + 4] = bitLenHigh & 0xff;
  tail[lenOffset + 5] = (bitLenHigh >>> 8) & 0xff;
  tail[lenOffset + 6] = (bitLenHigh >>> 16) & 0xff;
  tail[lenOffset + 7] = (bitLenHigh >>> 24) & 0xff;

  for (let bIdx = 0; bIdx < totalBlocks; bIdx++) {
    for (let j = 0; j < 16; j++) {
      const idx = bIdx * 64 + j * 4;
      M[j] =
        tail[idx] |
        (tail[idx + 1] << 8) |
        (tail[idx + 2] << 16) |
        (tail[idx + 3] << 24);
    }
    processBlock();
  }

  function toHex(n) {
    let s = '';
    for (let i = 0; i < 4; i++) {
      s += ((n >>> (i * 8)) & 0xff).toString(16).padStart(2, '0');
    }
    return s;
  }
  return (toHex(a) + toHex(b) + toHex(c) + toHex(d)).toLowerCase();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const DEFAULT_SETTINGS = {
  clientId: '202264815644.apps.googleusercontent.com',
  clientSecret: 'X4Z3ca8xfWDb1Voo-F9a7ZxJ',
  refreshToken: '',
  remoteFolderName: 'Obsidian_Archive_Vault',
  remoteRootFolderId: '',
  // Disable auto-upload by default on mobile/tablets so tablets don't accidentally push & crash on startup
  enableDailyAutoBackup: !obsidian.Platform.isMobile,
  dailyBackupTime: '23:00',
  backupOnStartupIfMissed: !obsidian.Platform.isMobile,
  maxMobileFileSizeMB: 80,
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

    // Only run background auto-push timer on desktop (or if explicitly enabled)
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
    if (this.logs.length > 100) this.logs.pop();
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
    if (obsidian.Platform.isMobile) return; // Never auto-push in background on tablet/phone
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

  async requestWithRetry(reqOptions, maxRetries = 8) {
    let attempt = 0;
    while (true) {
      const resp = await obsidian.requestUrl(Object.assign({ throw: false }, reqOptions));
      if (resp.status >= 200 && resp.status < 300) {
        return resp;
      }
      if ((resp.status === 403 || resp.status === 429 || resp.status >= 500) && attempt < maxRetries) {
        attempt++;
        const waitMs = Math.min(12000, 800 * Math.pow(1.7, attempt) + Math.floor(Math.random() * 500));
        await sleep(waitMs);
        continue;
      }
      return resp;
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

    const resp = await this.requestWithRetry({
      url: 'https://oauth2.googleapis.com/token',
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    });

    if (resp.status !== 200 || !resp.json || !resp.json.access_token) {
      throw new Error(`Google 액세스 토큰 갱신 실패: HTTP ${resp.status} ${resp.text}`);
    }

    this.accessToken = resp.json.access_token;
    this.accessTokenExpiry = Date.now() + (resp.json.expires_in || 3600) * 1000;
    return this.accessToken;
  }

  async driveRequest(url, options = {}) {
    const token = await this.getValidAccessToken();
    const headers = Object.assign({}, options.headers || {}, {
      Authorization: `Bearer ${token}`
    });
    const resp = await this.requestWithRetry(Object.assign({}, options, { url, headers }));
    if (resp.status < 200 || resp.status >= 300) {
      throw new Error(`Drive API 오류 (HTTP ${resp.status}): ${resp.text ? resp.text.slice(0, 200) : ''}`);
    }
    return resp;
  }

  async ensureRemoteRootFolder() {
    if (this.settings.remoteRootFolderId) {
      const token = await this.getValidAccessToken();
      const checkResp = await this.requestWithRetry({
        url: `https://www.googleapis.com/drive/v3/files/${this.settings.remoteRootFolderId}?fields=id,name,trashed`,
        headers: { Authorization: `Bearer ${token}` }
      }, 3);
      if (checkResp.status === 200 && checkResp.json && !checkResp.json.trashed) {
        return this.settings.remoteRootFolderId;
      }
    }

    const folderName = (this.settings.remoteFolderName || 'Obsidian_Archive_Vault').replace(/'/g, "\\'");
    const q = encodeURIComponent(
      `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and 'root' in parents and trashed = false`
    );
    const searchResp = await this.driveRequest(
      `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)&spaces=drive`
    );

    if (searchResp.json.files && searchResp.json.files.length > 0) {
      this.settings.remoteRootFolderId = searchResp.json.files[0].id;
      await this.saveSettings();
      return this.settings.remoteRootFolderId;
    }

    const createResp = await this.driveRequest('https://www.googleapis.com/drive/v3/files?fields=id', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: this.settings.remoteFolderName || 'Obsidian_Archive_Vault',
        mimeType: 'application/vnd.google-apps.folder',
        parents: ['root']
      })
    });

    this.settings.remoteRootFolderId = createResp.json.id;
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
        const url = `https://www.googleapis.com/drive/v3/files?q=${q}&pageSize=1000&fields=nextPageToken,files(id,name,mimeType,md5Checksum,size,modifiedTime)&pageToken=${pageToken}`;
        const resp = await this.driveRequest(url);
        const files = (resp.json && resp.json.files) || [];
        for (const item of files) {
          const relPath = currentFolder.pathPrefix ? `${currentFolder.pathPrefix}/${item.name}` : item.name;
          if (item.mimeType === 'application/vnd.google-apps.folder') {
            foldersByPath.set(relPath, item.id);
            queue.push({ id: item.id, pathPrefix: relPath });
          } else {
            filesByPath.set(relPath, {
              id: item.id,
              name: item.name,
              md5Checksum: item.md5Checksum || '',
              size: Number(item.size || 0),
              modifiedTime: item.modifiedTime,
              parentId: currentFolder.id
            });
          }
        }
        pageToken = (resp.json && resp.json.nextPageToken) || '';
      } while (pageToken);
    }

    return { foldersByPath, filesByPath };
  }

  async ensureRemoteSubfolder(relFolderPath, foldersByPath) {
    if (!relFolderPath) return foldersByPath.get('');
    if (foldersByPath.has(relFolderPath)) return foldersByPath.get(relFolderPath);

    const parts = relFolderPath.split('/');
    let currentPath = '';
    let parentId = foldersByPath.get('');

    for (const part of parts) {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      if (foldersByPath.has(currentPath)) {
        parentId = foldersByPath.get(currentPath);
      } else {
        const createResp = await this.driveRequest('https://www.googleapis.com/drive/v3/files?fields=id', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: part,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [parentId]
          })
        });
        parentId = createResp.json.id;
        foldersByPath.set(currentPath, parentId);
      }
    }
    return parentId;
  }

  async uploadBinaryFile(relPath, arrayBuffer, parentFolderId, existingFileId = null) {
    const fileName = relPath.split('/').pop();
    const metadata = existingFileId
      ? { name: fileName }
      : { name: fileName, parents: [parentFolderId] };

    const initUrl = existingFileId
      ? `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=resumable`
      : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable';

    const initMethod = existingFileId ? 'PATCH' : 'POST';
    const token = await this.getValidAccessToken();

    const initResp = await this.requestWithRetry({
      url: initUrl,
      method: initMethod,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Type': 'application/octet-stream',
        'X-Upload-Content-Length': String(arrayBuffer.byteLength)
      },
      body: JSON.stringify(metadata)
    });

    if (initResp.status < 200 || initResp.status >= 300) {
      throw new Error(`업로드 초기화 실패 (${relPath}): HTTP ${initResp.status} ${initResp.text}`);
    }

    const uploadLocation =
      initResp.headers['location'] ||
      initResp.headers['Location'] ||
      Object.entries(initResp.headers || {}).find(([k]) => k.toLowerCase() === 'location')?.[1];

    if (!uploadLocation) {
      throw new Error(`Resumable 업로드 URL 수신 실패: ${relPath}`);
    }

    const putResp = await this.requestWithRetry({
      url: uploadLocation,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/octet-stream'
      },
      body: arrayBuffer
    });

    if (putResp.status !== 200 && putResp.status !== 201) {
      throw new Error(`파일 업로드 실패 (${relPath}): HTTP ${putResp.status}`);
    }
  }

  async downloadBinaryFile(fileId) {
    const token = await this.getValidAccessToken();
    const resp = await this.requestWithRetry({
      url: `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    if (resp.status < 200 || resp.status >= 300) {
      throw new Error(`파일 다운로드 실패 (${fileId}): HTTP ${resp.status}`);
    }
    return resp.arrayBuffer;
  }

  shouldIgnorePath(relPath) {
    const name = relPath.split('/').pop();
    if (name === '.DS_Store' || name === 'Thumbs.db' || name === 'desktop.ini') {
      return true;
    }
    if (relPath.startsWith('.git/') || relPath === '.git') {
      return true;
    }
    if (!this.settings.includeObsidianConfig) {
      const configDir = this.app.vault.configDir || '.obsidian';
      if (relPath === configDir || relPath.startsWith(`${configDir}/`)) {
        return true;
      }
    } else {
      const ownDataPath = `${this.app.vault.configDir}/plugins/${this.manifest.id}/data.json`;
      if (relPath === ownDataPath || relPath.endsWith('drive-keeper/data.json')) return true;
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
            relPath: file,
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
    this.addLog('🚀 [업로드 / Push] 시작...');

    try {
      const rootFolderId = await this.ensureRemoteRootFolder();
      const [localFiles, remoteTree] = await Promise.all([
        this.listAllLocalFiles(),
        this.buildRemoteTree(rootFolderId)
      ]);

      const { foldersByPath, filesByPath } = remoteTree;
      this.addLog(`📂 스캔 완료: 로컬 파일 ${localFiles.length}개 / 구글 드라이브 파일 ${filesByPath.size}개`);

      let uploadedCount = 0;
      let skippedCount = 0;
      const total = localFiles.length;
      const mobileMaxBytes = (this.settings.maxMobileFileSizeMB || 80) * 1024 * 1024;

      for (let i = 0; i < total; i++) {
        const localFile = localFiles[i];
        const remoteFile = filesByPath.get(localFile.relPath);

        if (progressCallback) {
          progressCallback(i + 1, total, `검사 중 (${i + 1}/${total}): ${localFile.relPath}`);
        }

        // Fast size check BEFORE reading file into memory!
        if (remoteFile && remoteFile.size === localFile.size) {
          // For files >= 15MB, matching exact byte size is sufficient and avoids reading huge files into RAM
          if (localFile.size >= 15 * 1024 * 1024) {
            skippedCount++;
            continue;
          }
          if (remoteFile.md5Checksum) {
            const checkBuf = await this.app.vault.adapter.readBinary(localFile.relPath);
            const localMd5 = md5ArrayBuffer(checkBuf);
            if (localMd5 === remoteFile.md5Checksum.toLowerCase()) {
              skippedCount++;
              continue;
            }
          }
        }

        // Protect mobile WebView from OOM crash on 100MB~500MB textbook PDFs
        if (obsidian.Platform.isMobile && localFile.size > mobileMaxBytes) {
          const sizeMB = Math.round(localFile.size / (1024 * 1024));
          this.addLog(`⚠️ 모바일 메모리 보호 (${sizeMB}MB 건너뜀): ${localFile.relPath}`);
          skippedCount++;
          continue;
        }

        if (progressCallback) {
          progressCallback(i + 1, total, `업로드 중 (${i + 1}/${total}): ${localFile.relPath}`);
        }

        const parentRelPath = localFile.relPath.includes('/')
          ? localFile.relPath.substring(0, localFile.relPath.lastIndexOf('/'))
          : '';
        const parentFolderId = await this.ensureRemoteSubfolder(parentRelPath, foldersByPath);

        let buffer = await this.app.vault.adapter.readBinary(localFile.relPath);
        await this.uploadBinaryFile(
          localFile.relPath,
          buffer,
          parentFolderId,
          remoteFile ? remoteFile.id : null
        );
        buffer = null; // Release reference immediately for GC
        uploadedCount++;
        this.addLog(`✅ 업로드 완료: ${localFile.relPath}`);

        if (obsidian.Platform.isMobile) {
          await sleep(60); // Give mobile WebView GC breathing room
        }
      }

      this.settings.lastBackupDate = this.getTodayDateString();
      this.settings.lastPushTimestamp = Date.now();
      this.settings.lastStatusSummary = `최근 업로드: ${new Date().toLocaleString()} (업로드 ${uploadedCount}개, 유지 ${skippedCount}개)`;
      await this.saveSettings();

      this.addLog(`🎉 업로드 완료! (새로 올림: ${uploadedCount}개, 변경 없음: ${skippedCount}개)`);
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
    this.addLog('🚀 [동기화 내려받기 / Pull] 시작...');

    try {
      const rootFolderId = await this.ensureRemoteRootFolder();
      const { filesByPath } = await this.buildRemoteTree(rootFolderId);

      const remoteEntries = Array.from(filesByPath.entries()).filter(
        ([relPath]) => !this.shouldIgnorePath(relPath)
      );

      this.addLog(`📂 원격 아카이브 파일 ${remoteEntries.length}개 확인됨. 비교 및 다운로드 시작...`);

      let downloadedCount = 0;
      let skippedCount = 0;
      const total = remoteEntries.length;
      const adapter = this.app.vault.adapter;
      const mobileMaxBytes = (this.settings.maxMobileFileSizeMB || 80) * 1024 * 1024;

      for (let i = 0; i < total; i++) {
        const [relPath, remoteFile] = remoteEntries[i];
        if (progressCallback) {
          progressCallback(i + 1, total, `확인 중 (${i + 1}/${total}): ${relPath}`);
        }

        const localStat = await adapter.stat(relPath);
        if (localStat && localStat.size === remoteFile.size) {
          if (remoteFile.size >= 15 * 1024 * 1024) {
            skippedCount++;
            continue;
          }
          if (remoteFile.md5Checksum) {
            const localBuffer = await adapter.readBinary(relPath);
            const localMd5 = md5ArrayBuffer(localBuffer);
            if (localMd5 === remoteFile.md5Checksum.toLowerCase()) {
              skippedCount++;
              continue;
            }
          }
        }

        if (obsidian.Platform.isMobile && remoteFile.size > mobileMaxBytes) {
          const sizeMB = Math.round(remoteFile.size / (1024 * 1024));
          this.addLog(`⚠️ 모바일 메모리 보호 (${sizeMB}MB 대용량 파일 건너뜀): ${relPath}`);
          skippedCount++;
          continue;
        }

        if (progressCallback) {
          progressCallback(i + 1, total, `다운로드 중 (${i + 1}/${total}): ${relPath}`);
        }

        let fileBuffer = await this.downloadBinaryFile(remoteFile.id);
        await this.ensureLocalParentDirs(relPath);
        await adapter.writeBinary(relPath, fileBuffer);
        fileBuffer = null; // Free memory immediately
        downloadedCount++;
        this.addLog(`📥 내려받기 완료: ${relPath}`);

        if (obsidian.Platform.isMobile) {
          await sleep(60); // Prevent mobile WebView OOM
        }
      }

      let deletedCount = 0;
      if (this.settings.deleteExtraneousOnPull) {
        const localFiles = await this.listAllLocalFiles();
        for (const lf of localFiles) {
          if (!filesByPath.has(lf.relPath)) {
            await adapter.remove(lf.relPath);
            deletedCount++;
            this.addLog(`🗑️ 원격에 없는 로컬 파일 정리: ${lf.relPath}`);
          }
        }
      }

      this.settings.lastPullTimestamp = Date.now();
      this.settings.lastStatusSummary = `최근 동기화(Pull): ${new Date().toLocaleString()} (다운로드 ${downloadedCount}개, 유지 ${skippedCount}개)`;
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
      // Force disable background auto-push on mobile tablets to prevent startup crashes
      this.settings.backupOnStartupIfMissed = false;
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
    header.createDiv({ cls: 'odk-hero-title', text: '☁️ Drive Vault Keeper' });

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
        : '꺼짐 (수동 명령만 사용)'
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

    const pushBtn = grid.createEl('button', { cls: 'odk-action-btn odk-primary' });
    pushBtn.createDiv({ cls: 'odk-btn-title', text: '☁️ 지금 구글 드라이브에 모셔두기 (Push)' });
    pushBtn.createDiv({
      cls: 'odk-btn-desc',
      text: '이 기기의 모든 아카이브 파일을 변형 없이 그대로 구글 드라이브에 업로드합니다.'
    });
    pushBtn.addEventListener('click', async () => {
      await this.plugin.runPushBackup(false, updateProgress);
      this.onOpen();
    });

    const pullBtn = grid.createEl('button', { cls: 'odk-action-btn' });
    pullBtn.createDiv({ cls: 'odk-btn-title', text: '📥 다른 기기에서 그대로 동기화받기 (Pull)' });
    pullBtn.createDiv({
      cls: 'odk-btn-desc',
      text: '구글 드라이브에 모셔둔 아카이브를 현재 기기로 똑같이 내려받아 동기화합니다.'
    });
    pullBtn.addEventListener('click', async () => {
      await this.plugin.runPullRestore(updateProgress);
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

    containerEl.createEl('h2', { text: '☁️ Drive Vault Keeper 설정' });

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
      .setDesc('모바일 앱 메모리 초과(튕김) 방지를 위해 이 용량을 넘는 초고용량 PDF(예: 500MB 스캔본)는 태블릿에서 건너뜁니다. (기본: 80MB)')
      .addText((text) =>
        text
          .setValue(String(this.plugin.settings.maxMobileFileSizeMB || 80))
          .onChange(async (value) => {
            const num = parseInt(value, 10);
            this.plugin.settings.maxMobileFileSizeMB = isNaN(num) ? 80 : num;
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
