# Obsidian Drive Vault Keeper

Cross-platform Obsidian plugin (**macOS, Windows, Android**) + standalone background daemon that backs up your entire Obsidian vault **100% untouched (1:1 binary preservation)** to Google Drive once a day and syncs it on demand to any other device.

## Key Features
- **100% Untouched Binary Preservation**: Transfers Markdown, PDFs, images, audio, and attachments as raw `ArrayBuffer` streams without modifying a single byte.
- **Fast Incremental MD5 Comparison**: Compares local MD5 checksums against Google Drive's `md5Checksum` so only new or modified files are uploaded/downloaded.
- **Daily Auto-Backup + On-Demand Push/Pull**:
  - **☁️ Push to Google Drive**: Back up the current device's vault to Google Drive (`/Obsidian_Archive_Vault`).
  - **📥 Pull from Google Drive**: Mirror the backed-up vault from Google Drive onto another desktop (Mac/Windows) or Android device.
- **Standalone macOS / Windows Background Daemon**: Included in `daemon/drive-keeper-cli.mjs` so daily backups run even when Obsidian is closed.
