# Drive Vault Keeper

Mirror and back up your entire vault untouched (1:1 binary preservation) to Google Drive once a day, and restore or sync on demand across macOS, Windows, and Android.

## Features

- **100% Untouched Binary Preservation**: Transfers Markdown notes, PDFs, images, audio, and attachments as raw `ArrayBuffer` streams without modifying a single byte.
- **Fast Incremental MD5 Comparison**: Compares local MD5 checksums against Google Drive's `md5Checksum` so only newly added or modified files are uploaded or downloaded.
- **Daily Auto-Backup + On-Demand Push/Pull**:
  - **Push to Google Drive**: Back up the current device's vault to a dedicated folder on Google Drive.
  - **Pull from Google Drive**: Mirror the backed-up vault from Google Drive onto another desktop (macOS/Windows) or Android device.

## Installation

1. Open **Settings** -> **Community plugins**.
2. Select **Browse** and search for **Drive Vault Keeper**.
3. Select **Install**, then **Enable**.

## Usage

1. Open **Settings** -> **Drive Vault Keeper** and enter your Google OAuth 2.0 Client ID, Client Secret, and Refresh Token.
2. Configure your preferred Google Drive target folder name (default: `Obsidian_Archive_Vault`) and daily auto-backup schedule.
3. Select the **Cloud icon** in the left ribbon (or run **Drive Vault Keeper: Open dashboard** from the Command Palette) to open the control modal:
   - Select **Push to Google Drive** to upload local changes untouched.
   - Select **Pull from Google Drive** on any device to download and mirror your remote vault.
