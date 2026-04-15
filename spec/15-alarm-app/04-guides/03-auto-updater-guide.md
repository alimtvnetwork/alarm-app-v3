# Auto-Updater Configuration Guide

**Version:** 1.1.0  
**Updated:** 2026-04-15  
**Status:** Active

---

## Overview

Tauri 2.x includes a built-in auto-updater (`tauri-plugin-updater`) that checks for new versions, downloads updates, and applies them — all with cryptographic signature verification. The Alarm App already has the plugin in `Cargo.toml`.

---

## Step 1: Generate Signing Keys

```bash
cargo tauri signer generate -w ~/.tauri/alarm-app.key
```

This creates:
- `~/.tauri/alarm-app.key` — **private key** (keep secret, add to CI)
- `~/.tauri/alarm-app.key.pub` — **public key** (embed in app config)

**Important:** Back up the private key. If lost, existing installations cannot verify updates.

---

## Step 2: Configure `tauri.conf.json`

Add the updater plugin configuration:

```json
{
  "plugins": {
    "updater": {
      "pubkey": "dW50cnVzdGVkIGNvbW1lbnQ6...",
      "endpoints": [
        "https://github.com/YOUR_USER/YOUR_REPO/releases/latest/download/latest.json"
      ],
      "dialog": true
    }
  }
}
```

### Configuration Options

| Key | Type | Description |
|-----|------|-------------|
| `pubkey` | string | Public key from Step 1 (contents of `.key.pub`) |
| `endpoints` | string[] | URLs to check for updates (supports multiple fallbacks) |
| `dialog` | boolean | Show native update dialog to user (`true` recommended) |

---

## Step 3: Update Endpoint Format

The updater expects a JSON file at the endpoint with this structure:

```json
{
  "version": "1.2.0",
  "notes": "Bug fixes and performance improvements",
  "pub_date": "2026-04-15T12:00:00Z",
  "platforms": {
    "darwin-aarch64": {
      "signature": "dW50cnVzdGVkIGNvbW1lbnQ6...",
      "url": "https://github.com/.../Alarm App_1.2.0_aarch64.app.tar.gz"
    },
    "darwin-x86_64": {
      "signature": "...",
      "url": "https://github.com/.../Alarm App_1.2.0_x64.app.tar.gz"
    },
    "windows-x86_64": {
      "signature": "...",
      "url": "https://github.com/.../Alarm App_1.2.0_x64-setup.nsis.zip"
    },
    "linux-x86_64": {
      "signature": "...",
      "url": "https://github.com/.../alarm-app_1.2.0_amd64.AppImage.tar.gz"
    }
  }
}
```

### Platform Keys

| Key | OS |
|-----|----|
| `darwin-aarch64` | macOS Apple Silicon |
| `darwin-x86_64` | macOS Intel |
| `windows-x86_64` | Windows 64-bit |
| `linux-x86_64` | Linux 64-bit |

---

## Step 4: GitHub Releases (Recommended)

When using `tauri-apps/tauri-action` in CI, the `latest.json` file is **automatically generated** and uploaded to the GitHub release. No manual endpoint needed.

### Endpoint URL format:
```
https://github.com/OWNER/REPO/releases/latest/download/latest.json
```

The action generates:
- Platform-specific bundles (`.dmg`, `.msi`, `.AppImage`)
- Compressed update bundles (`.tar.gz`, `.zip`)
- Signature files (`.sig`)
- `latest.json` manifest

---

## Step 5: CI Environment Variables

Add to GitHub Actions secrets (see CI/CD guide):

| Secret | Value |
|--------|-------|
| `TAURI_SIGNING_PRIVATE_KEY` | Contents of `~/.tauri/alarm-app.key` |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | Password set during key generation |

The `tauri-action` automatically:
1. Signs each bundle with the private key
2. Generates `.sig` signature files
3. Creates `latest.json` with all signatures and URLs

---

## Step 6: Programmatic Update Check (Optional)

For custom update UI instead of the built-in dialog, use the Rust API:

```rust
// In a Tauri command or setup
use tauri_plugin_updater::UpdaterExt;

app.handle().updater().check().await?;
```

Or from the frontend via IPC:

```typescript
import { check } from "@tauri-apps/plugin-updater";

const update = await check();
if (update) {
  console.log(`Update available: ${update.version}`);
  await update.downloadAndInstall();
}
```

---

## Step 7: Self-Hosted Endpoint (Alternative)

If not using GitHub Releases, host `latest.json` on any static server:

```bash
# Example: S3 or Cloudflare R2
aws s3 cp latest.json s3://alarm-app-updates/latest.json \
  --content-type application/json \
  --cache-control "max-age=300"
```

Update `tauri.conf.json` endpoints:
```json
"endpoints": [
  "https://updates.alarm-app.com/latest.json",
  "https://github.com/.../releases/latest/download/latest.json"
]
```

Multiple endpoints provide fallback redundancy.

---

## Update Flow

```
App Launch
    ↓
Check endpoint (GET latest.json)
    ↓
Compare version (semver)
    ↓
[No update] → Done
[Update available] → Show dialog
    ↓
User confirms → Download bundle
    ↓
Verify signature (pubkey)
    ↓
[Invalid] → Abort with error
[Valid] → Apply update → Restart app
```

---

## Testing Updates

### Local testing

1. Build version 1.1.0: `cargo tauri build`
2. Install it
3. Bump version to 1.2.0 in `tauri.conf.json` and `Cargo.toml`
4. Build again and host the bundle locally
5. Point endpoint to `http://localhost:8000/latest.json`
6. Run the installed 1.1.0 — it should detect and offer 1.2.0

### Quick local server

```bash
cd src-tauri/target/release/bundle
python3 -m http.server 8000
```

---

## Security Considerations

| Concern | Mitigation |
|---------|------------|
| Man-in-the-middle | Ed25519 signature verification on every update |
| Key compromise | Rotate keys + force manual update for key transition |
| Endpoint spoofing | HTTPS required for all endpoints |
| Downgrade attack | Tauri only installs versions newer than current |

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| "Signature verification failed" | Ensure `pubkey` in config matches the key used for signing |
| "No update available" when there is | Check version in `latest.json` is higher than installed |
| Update downloads but fails to install | Check file permissions and bundle format matches platform |
| Endpoint returns 404 | Verify `latest.json` exists at the exact URL |

---

## Cross-References

| Reference | Location |
|-----------|----------|
| CI/CD Pipeline Guide | `02-ci-cd-pipeline-guide.md` |
| Local Setup Guide | `01-tauri-local-setup-guide.md` |
| Tauri Updater Docs | [v2.tauri.app/plugin/updater](https://v2.tauri.app/plugin/updater) |
