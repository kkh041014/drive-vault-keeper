'use strict';

const obsidian = require('obsidian');

// ============================================================================
// Pure JS MD5 implementation (Works on macOS, Windows, and Android WebView)
// ============================================================================
function md5ArrayBuffer(buffer) {
  const bytes = new Uint8Array(buffer);
  function rotateLeft(lValue, iShiftBits) {
    return (lValue << iShiftBits) | (lValue >>> (32 - iShiftBits));
  }
  function addUnsigned(lX, lY) {
    const lX8 = lX & 0x80000000;
    const lY8 = lY & 0x80000000;
    const lX4 = lX & 0x40000000;
    const lY4 = lY & 0x40000000;
    const lResult = (lX & 0x3fffffff) + (lY & 0x3fffffff);
    if (lX4 & lY4) return lResult ^ 0x80000000 ^ lX8 ^ lY8;
    if (lX4 | lY4) {
      if (lResult & 0x40000000) return lResult ^ 0xc0000000 ^ lX8 ^ lY8;
      else return lResult ^ 0x40000000 ^ lX8 ^ lY8;
    } else {
      return lResult ^ lX8 ^ lY8;
    }
  }
  function F(x, y, z) { return (x & y) | (~x & z); }
  function G(x, y, z) { return (x & z) | (y & ~z); }
  function H(x, y, z) { return x ^ y ^ z; }
  function I(x, y, z) { return y ^ (x | ~z); }
  function FF(a, b, c, d, x, s, ac) {
    a = addUnsigned(a, addUnsigned(addUnsigned(F(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }
  function GG(a, b, c, d, x, s, ac) {
    a = addUnsigned(a, addUnsigned(addUnsigned(G(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }
  function HH(a, b, c, d, x, s, ac) {
    a = addUnsigned(a, addUnsigned(addUnsigned(H(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }
  function II(a, b, c, d, x, s, ac) {
    a = addUnsigned(a, addUnsigned(addUnsigned(I(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }

  const lByteLength = bytes.length;
  const lNumberOfWordsTemp1 = lByteLength + 8;
  const lNumberOfWordsTemp2 = (lNumberOfWordsTemp1 - (lNumberOfWordsTemp1 % 64)) / 64;
  const lNumberOfWords = (lNumberOfWordsTemp2 + 1) * 16;
  const lWordArray = new Int32Array(lNumberOfWords);
  let lBytePosition = 0;
  let lByteCount = 0;
  while (lByteCount < lByteLength) {
    const lWordCount = (lByteCount - (lByteCount % 4)) / 4;
    lBytePosition = (lByteCount % 4) * 8;
    lWordArray[lWordCount] = lWordArray[lWordCount] | (bytes[lByteCount] << lBytePosition);
    lByteCount++;
  }
  const lWordCount = (lByteCount - (lByteCount % 4)) / 4;
  lBytePosition = (lByteCount % 4) * 8;
  lWordArray[lWordCount] = lWordArray[lWordCount] | (0x80 << lBytePosition);
  lWordArray[lNumberOfWords - 2] = lByteLength << 3;
  lWordArray[lNumberOfWords - 1] = lByteLength >>> 29;

  let a = 0x67452301;
  let b = 0xefcdab89;
  let c = 0x98badcfe;
  let d = 0x10325476;

  for (let k = 0; k < lWordArray.length; k += 16) {
    const AA = a, BB = b, CC = c, DD = d;
    a = FF(a, b, c, d, lWordArray[k + 0], 7, 0xd76aa478);
    d = FF(d, a, b, c, lWordArray[k + 1], 12, 0xe8c7b756);
    c = FF(c, d, a, b, lWordArray[k + 2], 17, 0x242070db);
    b = FF(b, c, d, a, lWordArray[k + 3], 22, 0xc1bdceee);
    a = FF(a, b, c, d, lWordArray[k + 4], 7, 0xf57c0faf);
    d = FF(d, a, b, c, lWordArray[k + 5], 12, 0x4787c62a);
    c = FF(c, d, a, b, lWordArray[k + 6], 17, 0xa8304613);
    b = FF(b, c, d, a, lWordArray[k + 7], 22, 0xfd469501);
    a = FF(a, b, c, d, lWordArray[k + 8], 7, 0x698098d8);
    d = FF(d, a, b, c, lWordArray[k + 9], 12, 0x8b44f7af);
    c = FF(c, d, a, b, lWordArray[k + 10], 17, 0xffff5bb1);
    b = FF(b, c, d, a, lWordArray[k + 11], 22, 0x895cd7be);
    a = FF(a, b, c, d, lWordArray[k + 12], 7, 0x6b901122);
    d = FF(d, a, b, c, lWordArray[k + 13], 12, 0xfd987193);
    c = FF(c, d, a, b, lWordArray[k + 14], 17, 0xa679438e);
    b = FF(b, c, d, a, lWordArray[k + 15], 22, 0x49b40821);
    a = GG(a, b, c, d, lWordArray[k + 1], 5, 0xf61e2562);
    d = GG(d, a, b, c, lWordArray[k + 6], 9, 0xc040b340);
    c = GG(c, d, a, b, lWordArray[k + 11], 14, 0x265e5a51);
    b = GG(b, c, d, a, lWordArray[k + 0], 20, 0xe9b6c7aa);
    a = GG(a, b, c, d, lWordArray[k + 5], 5, 0xd62f105d);
    d = GG(d, a, b, c, lWordArray[k + 10], 9, 0x02441453);
    c = GG(c, d, a, b, lWordArray[k + 15], 14, 0xd8a1e681);
    b = GG(b, c, d, a, lWordArray[k + 4], 20, 0xe7d3fbc8);
    a = GG(a, b, c, d, lWordArray[k + 9], 5, 0x21e1cde6);
    d = GG(d, a, b, c, lWordArray[k + 14], 9, 0xc33707d6);
    c = GG(c, d, a, b, lWordArray[k + 3], 14, 0xf4d50d87);
    b = GG(b, c, d, a, lWordArray[k + 8], 20, 0x455a14ed);
    a = GG(a, b, c, d, lWordArray[k + 13], 5, 0xa9e3e905);
    d = GG(d, a, b, c, lWordArray[k + 2], 9, 0xfcefa3f8);
    c = GG(c, d, a, b, lWordArray[k + 7], 14, 0x676f02d9);
    b = GG(b, c, d, a, lWordArray[k + 12], 20, 0x8d2a4c8a);
    a = HH(a, b, c, d, lWordArray[k + 5], 4, 0xfffa3942);
    d = HH(d, a, b, c, lWordArray[k + 8], 11, 0x8771f681);
    c = HH(c, d, a, b, lWordArray[k + 11], 16, 0x6d9d6122);
    b = HH(b, c, d, a, lWordArray[k + 14], 23, 0xfde5380c);
    a = HH(a, b, c, d, lWordArray[k + 1], 4, 0xa4beea44);
    d = HH(d, a, b, c, lWordArray[k + 4], 11, 0x4bdecfa9);
    c = HH(c, d, a, b, lWordArray[k + 7], 16, 0xf6bb4b60);
    b = HH(b, c, d, a, lWordArray[k + 10], 23, 0xbebfbc70);
    a = HH(a, b, c, d, lWordArray[k + 13], 4, 0x289b7ec6);
    d = HH(d, a, b, c, lWordArray[k + 0], 11, 0xeaa127fa);
    c = HH(c, d, a, b, lWordArray[k + 3], 16, 0xd4ef3085);
    b = HH(b, c, d, a, lWordArray[k + 6], 23, 0x04881d05);
    a = HH(a, b, c, d, lWordArray[k + 9], 4, 0xd9d4d039);
    d = HH(d, a, b, c, lWordArray[k + 12], 11, 0xe6db99e5);
    c = HH(c, d, a, b, lWordArray[k + 15], 16, 0x1fa27cf8);
    b = HH(b, c, d, a, lWordArray[k + 2], 23, 0xc4ac5665);
    a = II(a, b, c, d, lWordArray[k + 0], 6, 0xf4292244);
    d = II(d, a, b, c, lWordArray[k + 7], 10, 0x432aff97);
    c = II(c, d, a, b, lWordArray[k + 14], 15, 0xab9423a7);
    b = II(b, c, d, a, lWordArray[k + 5], 21, 0xfc93a039);
    a = II(a, b, c, d, lWordArray[k + 12], 6, 0x655b59c3);
    d = II(d, a, b, c, lWordArray[k + 3], 10, 0x8f0ccc92);
    c = II(c, d, a, b, lWordArray[k + 10], 15, 0xffeff47d);
    b = II(b, c, d, a, lWordArray[k + 1], 21, 0x85845dd1);
    a = II(a, b, c, d, lWordArray[k + 8], 6, 0x6fa87e4f);
    d = II(d, a, b, c, lWordArray[k + 15], 10, 0xfe2ce6e0);
    c = II(c, d, a, b, lWordArray[k + 6], 15, 0xa3014314);
    b = II(b, c, d, a, lWordArray[k + 13], 21, 0x4e0811a1);
    a = II(a, b, c, d, lWordArray[k + 4], 6, 0xf7537e82);
    d = II(d, a, b, c, lWordArray[k + 11], 10, 0xbd3af235);
    c = II(c, d, a, b, lWordArray[k + 2], 15, 0x2ad7d2bb);
    b = II(b, c, d, a, lWordArray[k + 9], 21, 0xeb86d391);
    a = addUnsigned(a, AA);
    b = addUnsigned(b, BB);
    c = addUnsigned(c, CC);
    d = addUnsigned(d, DD);
  }

  function wordToHex(lValue) {
    let s = '';
    for (let lCount = 0; lCount <= 3; lCount++) {
      const lByte = (lValue >>> (lCount * 8)) & 255;
      const temp = '0' + lByte.toString(16);
      s += temp.substr(temp.length - 2, 2);
    }
    return s;
  }
  return (wordToHex(a) + wordToHex(b) + wordToHex(c) + wordToHex(d)).toLowerCase();
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
  enableDailyAutoBackup: true,
  dailyBackupTime: '23:00',
  backupOnStartupIfMissed: true,
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
      if (this.settings.enableDailyAutoBackup && this.settings.backupOnStartupIfMissed) {
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
  // Resilient Request Layer with Exponential Backoff (Handles 403 Rate Limit & 429)
  // ==========================================================================
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

  async tryDesktopRcloneSync() {
    return false;
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
      // Try high-speed resilient rclone engine on Desktop first
      const handledByRclone = await this.tryDesktopRcloneSync('push', progressCallback);
      if (handledByRclone) {
        this.settings.lastBackupDate = this.getTodayDateString();
        this.settings.lastPushTimestamp = Date.now();
        this.settings.lastStatusSummary = `최근 업로드: ${new Date().toLocaleString()} (원본 1:1 동기화 완료)`;
        await this.saveSettings();
        this.addLog('🎉 구글 드라이브 1:1 무변형 업로드 완료!');
        this.updateStatusBar('☁️ Drive 백업 완료');
        new obsidian.Notice('✅ 구글 드라이브에 아카이브 업로드가 완료되었습니다!');
        return;
      }

      // Pure REST API engine (Android & fallback)
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

      for (let i = 0; i < total; i++) {
        const localFile = localFiles[i];
        const remoteFile = filesByPath.get(localFile.relPath);

        if (progressCallback) {
          progressCallback(i + 1, total, `검사 중: ${localFile.relPath}`);
        }

        const buffer = await this.app.vault.adapter.readBinary(localFile.relPath);
        if (remoteFile && remoteFile.size === buffer.byteLength && remoteFile.md5Checksum) {
          const localMd5 = md5ArrayBuffer(buffer);
          if (localMd5 === remoteFile.md5Checksum.toLowerCase()) {
            skippedCount++;
            continue;
          }
        }

        if (progressCallback) {
          progressCallback(i + 1, total, `업로드 중: ${localFile.relPath}`);
        }

        const parentRelPath = localFile.relPath.includes('/')
          ? localFile.relPath.substring(0, localFile.relPath.lastIndexOf('/'))
          : '';
        const parentFolderId = await this.ensureRemoteSubfolder(parentRelPath, foldersByPath);

        await this.uploadBinaryFile(
          localFile.relPath,
          buffer,
          parentFolderId,
          remoteFile ? remoteFile.id : null
        );
        uploadedCount++;
        this.addLog(`✅ 업로드 완료: ${localFile.relPath}`);
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
      const handledByRclone = await this.tryDesktopRcloneSync('pull', progressCallback);
      if (handledByRclone) {
        this.settings.lastPullTimestamp = Date.now();
        this.settings.lastStatusSummary = `최근 동기화(Pull): ${new Date().toLocaleString()} (원본 1:1 내려받기 완료)`;
        await this.saveSettings();
        this.addLog('🎉 구글 드라이브 1:1 동기화 내려받기 완료!');
        this.updateStatusBar('☁️ Drive 동기화됨');
        new obsidian.Notice('✅ 구글 드라이브에서 아카이브 동기화가 완료되었습니다!');
        return;
      }

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

      for (let i = 0; i < total; i++) {
        const [relPath, remoteFile] = remoteEntries[i];
        if (progressCallback) {
          progressCallback(i + 1, total, `확인 중: ${relPath}`);
        }

        const existsLocally = await adapter.exists(relPath);
        if (existsLocally && remoteFile.md5Checksum) {
          const localBuffer = await adapter.readBinary(relPath);
          if (localBuffer.byteLength === remoteFile.size) {
            const localMd5 = md5ArrayBuffer(localBuffer);
            if (localMd5 === remoteFile.md5Checksum.toLowerCase()) {
              skippedCount++;
              continue;
            }
          }
        }

        if (progressCallback) {
          progressCallback(i + 1, total, `다운로드 중: ${relPath}`);
        }

        const fileBuffer = await this.downloadBinaryFile(remoteFile.id);
        await this.ensureLocalParentDirs(relPath);
        await adapter.writeBinary(relPath, fileBuffer);
        downloadedCount++;
        this.addLog(`📥 내려받기 완료: ${relPath}`);
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
      this.plugin.settings.enableDailyAutoBackup
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
      .setName('이 기기에서 하루 1번 자동 업로드 사용')
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
