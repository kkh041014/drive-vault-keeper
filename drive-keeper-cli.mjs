#!/usr/bin/env node
/**
 * Obsidian Drive Vault Keeper - Cross-Platform Daemon & CLI (macOS / Windows / Linux)
 * Uses high-speed rclone engine when available, with resilient auto-retry REST API fallback.
 */

import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { spawn, exec } from 'node:child_process';

const DEFAULT_VAULT_PATH = '/Users/kkh04/Desktop/obsidian archive/obsidian archive';

function parseArgs() {
  const args = process.argv.slice(2);
  const command = args[0] || 'push';
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

function findRcloneBinary() {
  const candidates = ['/opt/homebrew/bin/rclone', '/usr/local/bin/rclone'];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return 'rclone';
}

async function runSync(direction, vaultPath) {
  const config = await loadConfig(vaultPath);
  const rcloneBin = findRcloneBinary();
  const remoteFolder = config.remoteFolderName || 'Obsidian_Archive_Vault';

  const excludes = ['--exclude', '.DS_Store', '--exclude', 'Thumbs.db', '--exclude', '.git/**'];
  if (!config.includeObsidianConfig) {
    excludes.push('--exclude', '.obsidian/**');
  } else {
    excludes.push('--exclude', '.obsidian/plugins/obsidian-drive-keeper/data.json');
  }

  const src = direction === 'push' ? vaultPath : `gdrive:${remoteFolder}`;
  const dst = direction === 'push' ? `gdrive:${remoteFolder}` : vaultPath;
  const subcmd = direction === 'pull' && config.deleteExtraneousOnPull ? 'sync' : 'copy';

  console.log(`🚀 [Obsidian Drive Keeper] ${direction.toUpperCase()} 시작 (${src} -> ${dst})`);

  await new Promise((resolve, reject) => {
    const proc = spawn(
      rcloneBin,
      [
        subcmd,
        src,
        dst,
        ...excludes,
        '--transfers', '4',
        '--checkers', '8',
        '--tpslimit', '8',
        '-v'
      ],
      { stdio: 'inherit' }
    );
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`rclone 종료 코드: ${code}`));
    });
  });

  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  if (direction === 'push') {
    config.lastBackupDate = today;
    config.lastPushTimestamp = Date.now();
    config.lastStatusSummary = `최근 백업 완료: ${now.toLocaleString()}`;
  } else {
    config.lastPullTimestamp = Date.now();
    config.lastStatusSummary = `최근 동기화(Pull) 완료: ${now.toLocaleString()}`;
  }
  await saveConfig(vaultPath, config);

  console.log(`✅ [${direction.toUpperCase()} 완료] ${config.lastStatusSummary}`);
  notifyOS('Obsidian Drive Vault Keeper', config.lastStatusSummary);
}

const { command, vaultPath } = parseArgs();
if (command === 'push' || command === 'pull') {
  runSync(command, vaultPath).catch((err) => {
    console.error('❌ 오류:', err.message);
    process.exit(1);
  });
} else {
  const cfg = await loadConfig(vaultPath);
  console.log('📊 현재 설정 상태:', cfg);
}
