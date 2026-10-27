#!/usr/bin/env node
/**
 * Obsidian Drive Vault Keeper - Cross-Platform Daemon & CLI (macOS / Windows / Linux)
 * Zero external dependencies (Pure Node.js built-ins).
 * Shares configuration directly with `.obsidian/plugins/obsidian-drive-keeper/data.json`.
 */

import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import http from 'node:http';
import { exec } from 'node:child_process';

const DEFAULT_VAULT_PATH = '/Users/kkh04/Desktop/obsidian archive/obsidian archive';

function parseArgs() {
  const args = process.argv.slice(2);
  const command = args[0] || 'push'; // 'push' | 'pull' | 'auth' | 'status'
  let vaultPath = process.env.OBSIDIAN_VAULT_PATH || DEFAULT_VAULT_PATH;

  for (let i = 1; i < args.length; i++) {
    if ((args[i] === '--vault' || args[i] === '-v') && args[i + 1]) {
      vaultPath = path.resolve(args[i + 1]);
      i++;
    }
  }
  return { command, vaultPath };
}

function getConfigPath(vaultPath) {
  return path.join(vaultPath, '.obsidian', 'plugins', 'obsidian-drive-keeper', 'data.json');
}

async function loadConfig(vaultPath) {
  const cfgPath = getConfigPath(vaultPath);
  try {
    const raw = await fsp.readFile(cfgPath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return {
      clientId: '',
      clientSecret: '',
      refreshToken: '',
      remoteFolderName: 'Obsidian_Archive_Vault',
      remoteRootFolderId: '',
      enableDailyAutoBackup: true,
      dailyBackupTime: '23:00',
      backupOnStartupIfMissed: true,
      includeObsidianConfig: false,
      deleteExtraneousOnPull: false,
      lastBackupDate: '',
      lastPushTimestamp: 0,
      lastPullTimestamp: 0,
      lastStatusSummary: '아직 동기화 기록이 없습니다.'
    };
  }
}

async function saveConfig(vaultPath, config) {
  const cfgPath = getConfigPath(vaultPath);
  await fsp.mkdir(path.dirname(cfgPath), { recursive: true });
  await fsp.writeFile(cfgPath, JSON.stringify(config, null, 2), 'utf8');
}

function notifyOS(title, message) {
  if (process.platform === 'darwin') {
    const safeTitle = title.replace(/"/g, '\\"');
    const safeMsg = message.replace(/"/g, '\\"');
    exec(`osascript -e 'display notification "${safeMsg}" with title "${safeTitle}"'`);
  }
}

function openBrowser(url) {
  if (process.platform === 'darwin') {
    exec(`open "${url}"`);
  } else if (process.platform === 'win32') {
    exec(`start "" "${url}"`);
  } else {
    exec(`xdg-open "${url}"`);
  }
}

async function getAccessToken(config) {
  if (!config.clientId || !config.clientSecret || !config.refreshToken) {
    throw new Error(
      'Google Drive 인증 정보가 없습니다. 옵시디언 플러그인 설정 또는 `drive-keeper-cli.mjs auth`로 먼저 계정을 연결해주세요.'
    );
  }

  const body = new URLSearchParams({
    client_id: config.clientId.trim(),
    client_secret: config.clientSecret.trim(),
    refresh_token: config.refreshToken.trim(),
    grant_type: 'refresh_token'
  });

  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });

  const data = await resp.json();
  if (!resp.ok || !data.access_token) {
    throw new Error(`Google 액세스 토큰 발급 실패: ${JSON.stringify(data)}`);
  }
  return data.access_token;
}

async function ensureRemoteRootFolder(token, config, vaultPath) {
  if (config.remoteRootFolderId) {
    const check = await fetch(
      `https://www.googleapis.com/drive/v3/files/${config.remoteRootFolderId}?fields=id,name,trashed`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (check.ok) {
      const meta = await check.json();
      if (!meta.trashed) return config.remoteRootFolderId;
    }
  }

  const folderName = (config.remoteFolderName || 'Obsidian_Archive_Vault').replace(/'/g, "\\'");
  const q = encodeURIComponent(
    `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and 'root' in parents and trashed = false`
  );
  const searchResp = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)&spaces=drive`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const searchData = await searchResp.json();
  if (searchData.files && searchData.files.length > 0) {
    config.remoteRootFolderId = searchData.files[0].id;
    await saveConfig(vaultPath, config);
    return config.remoteRootFolderId;
  }

  const createResp = await fetch('https://www.googleapis.com/drive/v3/files?fields=id', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: config.remoteFolderName || 'Obsidian_Archive_Vault',
      mimeType: 'application/vnd.google-apps.folder',
      parents: ['root']
    })
  });
  const created = await createResp.json();
  config.remoteRootFolderId = created.id;
  await saveConfig(vaultPath, config);
  return config.remoteRootFolderId;
}

async function buildRemoteTree(token, rootFolderId) {
  const foldersByPath = new Map();
  const filesByPath = new Map();
  foldersByPath.set('', rootFolderId);

  const queue = [{ id: rootFolderId, pathPrefix: '' }];
  while (queue.length > 0) {
    const batch = queue.splice(0, 4);
    await Promise.all(
      batch.map(async (folder) => {
        let pageToken = '';
        do {
          const q = encodeURIComponent(`'${folder.id}' in parents and trashed = false`);
          const url = `https://www.googleapis.com/drive/v3/files?q=${q}&pageSize=1000&fields=nextPageToken,files(id,name,mimeType,md5Checksum,size,modifiedTime)&pageToken=${pageToken}`;
          const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
          const data = await resp.json();
          for (const item of data.files || []) {
            const relPath = folder.pathPrefix ? `${folder.pathPrefix}/${item.name}` : item.name;
            if (item.mimeType === 'application/vnd.google-apps.folder') {
              foldersByPath.set(relPath, item.id);
              queue.push({ id: item.id, pathPrefix: relPath });
            } else {
              filesByPath.set(relPath, {
                id: item.id,
                name: item.name,
                md5Checksum: item.md5Checksum || '',
                size: Number(item.size || 0)
              });
            }
          }
          pageToken = data.nextPageToken || '';
        } while (pageToken);
      })
    );
  }
  return { foldersByPath, filesByPath };
}

async function ensureRemoteSubfolder(token, relFolderPath, foldersByPath) {
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
      const resp = await fetch('https://www.googleapis.com/drive/v3/files?fields=id', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: part,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [parentId]
        })
      });
      const created = await resp.json();
      parentId = created.id;
      foldersByPath.set(currentPath, parentId);
    }
  }
  return parentId;
}

function shouldIgnore(relPath, includeObsidianConfig) {
  const base = path.posix.basename(relPath);
  if (base === '.DS_Store' || base === 'Thumbs.db' || base === 'desktop.ini') return true;
  if (relPath === '.git' || relPath.startsWith('.git/')) return true;
  if (!includeObsidianConfig) {
    if (relPath === '.obsidian' || relPath.startsWith('.obsidian/')) return true;
  } else {
    if (relPath === '.obsidian/plugins/obsidian-drive-keeper/data.json') return true;
  }
  return false;
}

async function scanLocalVault(vaultPath, includeObsidianConfig) {
  const results = [];
  async function walk(currentRel) {
    const fullDir = currentRel ? path.join(vaultPath, ...currentRel.split('/')) : vaultPath;
    const entries = await fsp.readdir(fullDir, { withFileTypes: true });
    for (const entry of entries) {
      const relPath = currentRel ? `${currentRel}/${entry.name}` : entry.name;
      if (shouldIgnore(relPath, includeObsidianConfig)) continue;
      if (entry.isDirectory()) {
        await walk(relPath);
      } else if (entry.isFile()) {
        const fullPath = path.join(vaultPath, ...relPath.split('/'));
        const stat = await fsp.stat(fullPath);
        results.push({ relPath, fullPath, size: stat.size });
      }
    }
  }
  await walk('');
  return results;
}

async function computeFileMd5(fullPath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('md5');
    const stream = fs.createReadStream(fullPath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex').toLowerCase()));
    stream.on('error', reject);
  });
}

async function uploadFileUntouched(token, fullPath, relPath, parentFolderId, existingFileId = null) {
  const fileBuffer = await fsp.readFile(fullPath);
  const fileName = path.posix.basename(relPath);
  const metadata = existingFileId ? { name: fileName } : { name: fileName, parents: [parentFolderId] };
  const initUrl = existingFileId
    ? `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=resumable`
    : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable';

  const initResp = await fetch(initUrl, {
    method: existingFileId ? 'PATCH' : 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json; charset=UTF-8',
      'X-Upload-Content-Type': 'application/octet-stream',
      'X-Upload-Content-Length': String(fileBuffer.byteLength)
    },
    body: JSON.stringify(metadata)
  });

  const uploadLocation = initResp.headers.get('location');
  if (!uploadLocation) {
    throw new Error(`Resumable 세션 생성 실패: ${relPath}`);
  }

  const putResp = await fetch(uploadLocation, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/octet-stream' },
    body: fileBuffer
  });

  if (!putResp.ok) {
    throw new Error(`업로드 실패 (${relPath}): HTTP ${putResp.status}`);
  }
}

async function runPush(vaultPath) {
  const config = await loadConfig(vaultPath);
  console.log(`☁️ [Obsidian Drive Keeper] 업로드(Push) 시작 — 대상 보관함: ${vaultPath}`);
  const token = await getAccessToken(config);
  const rootFolderId = await ensureRemoteRootFolder(token, config, vaultPath);

  const [localFiles, remoteTree] = await Promise.all([
    scanLocalVault(vaultPath, config.includeObsidianConfig),
    buildRemoteTree(token, rootFolderId)
  ]);

  const { foldersByPath, filesByPath } = remoteTree;
  console.log(`📂 로컬 파일 ${localFiles.length}개 / 원격 파일 ${filesByPath.size}개 비교 중...`);

  let uploaded = 0;
  let skipped = 0;

  for (let i = 0; i < localFiles.length; i++) {
    const lf = localFiles[i];
    const rf = filesByPath.get(lf.relPath);
    if (rf && rf.size === lf.size && rf.md5Checksum) {
      const md5 = await computeFileMd5(lf.fullPath);
      if (md5 === rf.md5Checksum.toLowerCase()) {
        skipped++;
        continue;
      }
    }

    const parentRel = lf.relPath.includes('/')
      ? lf.relPath.substring(0, lf.relPath.lastIndexOf('/'))
      : '';
    const parentId = await ensureRemoteSubfolder(token, parentRel, foldersByPath);
    process.stdout.write(`⬆️ [${i + 1}/${localFiles.length}] 업로드: ${lf.relPath}\n`);
    await uploadFileUntouched(token, lf.fullPath, lf.relPath, parentId, rf ? rf.id : null);
    uploaded++;
  }

  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  config.lastBackupDate = today;
  config.lastPushTimestamp = Date.now();
  config.lastStatusSummary = `최근 백업(데몬/CLI): ${now.toLocaleString()} (업로드 ${uploaded}개, 동일 유지 ${skipped}개)`;
  await saveConfig(vaultPath, config);

  const summaryMsg = `업로드 ${uploaded}개 완료, 변경 없는 파일 ${skipped}개 유지`;
  console.log(`✅ [완료] ${summaryMsg}`);
  notifyOS('Obsidian Drive Vault Keeper', `구글 드라이브 백업 완료! (${summaryMsg})`);
}

async function runPull(vaultPath) {
  const config = await loadConfig(vaultPath);
  console.log(`📥 [Obsidian Drive Keeper] 동기화 내려받기(Pull) 시작 -> ${vaultPath}`);
  const token = await getAccessToken(config);
  const rootFolderId = await ensureRemoteRootFolder(token, config, vaultPath);
  const { filesByPath } = await buildRemoteTree(token, rootFolderId);

  const entries = Array.from(filesByPath.entries()).filter(
    ([relPath]) => !shouldIgnore(relPath, config.includeObsidianConfig)
  );

  let downloaded = 0;
  let skipped = 0;

  for (let i = 0; i < entries.length; i++) {
    const [relPath, rf] = entries[i];
    const fullPath = path.join(vaultPath, ...relPath.split('/'));

    try {
      const stat = await fsp.stat(fullPath);
      if (stat.size === rf.size && rf.md5Checksum) {
        const md5 = await computeFileMd5(fullPath);
        if (md5 === rf.md5Checksum.toLowerCase()) {
          skipped++;
          continue;
        }
      }
    } catch {
      // File doesn't exist locally yet
    }

    process.stdout.write(`⬇️ [${i + 1}/${entries.length}] 다운로드: ${relPath}\n`);
    const resp = await fetch(`https://www.googleapis.com/drive/v3/files/${rf.id}?alt=media`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!resp.ok) throw new Error(`다운로드 실패 (${relPath}): HTTP ${resp.status}`);
    const arrayBuf = await resp.arrayBuffer();
    await fsp.mkdir(path.dirname(fullPath), { recursive: true });
    await fsp.writeFile(fullPath, Buffer.from(arrayBuf));
    downloaded++;
  }

  const now = new Date();
  config.lastPullTimestamp = Date.now();
  config.lastStatusSummary = `최근 동기화(Pull): ${now.toLocaleString()} (다운로드 ${downloaded}개, 동일 유지 ${skipped}개)`;
  await saveConfig(vaultPath, config);

  const summaryMsg = `다운로드 ${downloaded}개 완료, 동일 파일 ${skipped}개 유지`;
  console.log(`✅ [동기화 완료] ${summaryMsg}`);
  notifyOS('Obsidian Drive Vault Keeper', `구글 드라이브 동기화 완료! (${summaryMsg})`);
}

async function runInteractiveAuth(vaultPath) {
  const config = await loadConfig(vaultPath);
  if (!config.clientId || !config.clientSecret) {
    console.log('⚠️ 먼저 옵시디언 플러그인 설정에서 Client ID와 Client Secret을 입력해 주세요.');
    process.exit(1);
  }

  const port = 53682;
  const redirectUri = `http://127.0.0.1:${port}/callback`;

  const server = http.createServer(async (req, res) => {
    const urlObj = new URL(req.url, redirectUri);
    if (urlObj.pathname !== '/callback') {
      res.writeHead(404);
      res.end();
      return;
    }
    const code = urlObj.searchParams.get('code');
    if (!code) {
      res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<h2>인증 코드를 받지 못했습니다. 다시 시도해주세요.</h2>');
      return;
    }

    try {
      const body = new URLSearchParams({
        code,
        client_id: config.clientId.trim(),
        client_secret: config.clientSecret.trim(),
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      });
      const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body
      });
      const tokenData = await tokenResp.json();
      if (!tokenResp.ok || !tokenData.refresh_token) {
        throw new Error(JSON.stringify(tokenData));
      }
      config.refreshToken = tokenData.refresh_token;
      await saveConfig(vaultPath, config);

      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<h2>✅ Google Drive 연결이 완료되었습니다! 이 브라우저 창을 닫으셔도 됩니다.</h2>');
      console.log('🎉 Refresh Token이 옵시디언 플러그인 설정에 성공적으로 저장되었습니다!');
      setTimeout(() => process.exit(0), 500);
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`<h2>❌ 토큰 교환 실패: ${e.message}</h2>`);
    }
  });

  server.listen(port, '127.0.0.1', () => {
    const authUrl =
      `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(config.clientId.trim())}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=code&` +
      `scope=${encodeURIComponent('https://www.googleapis.com/auth/drive')}&` +
      `access_type=offline&prompt=consent`;
    console.log(`🌐 브라우저에서 Google 로그인 창을 엽니다...\n${authUrl}`);
    openBrowser(authUrl);
  });
}

const { command, vaultPath } = parseArgs();
if (command === 'push') {
  runPush(vaultPath).catch((err) => {
    console.error('❌ 업로드 오류:', err.message);
    process.exit(1);
  });
} else if (command === 'pull') {
  runPull(vaultPath).catch((err) => {
    console.error('❌ 동기화 오류:', err.message);
    process.exit(1);
  });
} else if (command === 'auth') {
  runInteractiveAuth(vaultPath);
} else {
  const cfg = await loadConfig(vaultPath);
  console.log('📊 현재 설정 상태:', cfg);
}
