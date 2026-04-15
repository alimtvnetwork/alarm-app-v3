# Tauri Local Setup Guide

**Version:** 1.1.0  
**Updated:** 2026-04-15  
**Status:** Active

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Rust | 1.75+ | [rustup.rs](https://rustup.rs) |
| Node.js | 18+ | [nodejs.org](https://nodejs.org) |
| Tauri CLI | 2.x | `cargo install tauri-cli --version "^2"` |
| Platform deps | — | See [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) |

### Platform-Specific Dependencies

**macOS:**
```bash
xcode-select --install
```

**Windows:**
- Visual Studio Build Tools 2022 (C++ workload)
- WebView2 (pre-installed on Windows 11)

**Linux (Ubuntu/Debian):**
```bash
sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file \
  libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
```

---

## Step-by-Step Setup

### 1. Install Dependencies

```bash
# Frontend dependencies
npm install

# Install @tauri-apps/api (required for native IPC)
npm install @tauri-apps/api@^2
```

### 2. Verify Rust Toolchain

```bash
rustc --version    # Should be 1.75+
cargo --version
```

### 3. Run in Development Mode

```bash
# This starts both Vite dev server AND Rust backend
cargo tauri dev
```

- Vite starts on `http://localhost:8080`
- Tauri opens a native window pointing to it
- Hot-reload works for both frontend (Vite HMR) and backend (cargo rebuild)

### 4. First Run — Database

On first launch, the Rust backend automatically:
1. Creates `alarm_app.db` in the app data directory
2. Runs all 3 SQLite migrations (schema, quotes seed, alarm position)
3. Seeds default settings
4. Enables WAL mode for performance

Database location:
- **macOS:** `~/Library/Application Support/com.alarm-app/alarm_app.db`
- **Windows:** `%APPDATA%\com.alarm-app\alarm_app.db`
- **Linux:** `~/.local/share/com.alarm-app/alarm_app.db`

---

## Build for Production

### 5. Create Release Build

```bash
cargo tauri build
```

Output locations:
- **macOS:** `src-tauri/target/release/bundle/dmg/Alarm App_1.1.0_aarch64.dmg`
- **Windows:** `src-tauri/target/release/bundle/msi/Alarm App_1.1.0_x64_en-US.msi`
- **Linux:** `src-tauri/target/release/bundle/appimage/alarm-app_1.1.0_amd64.AppImage`

---

## IPC Architecture

The app uses a dual-path IPC adapter:

```
Frontend (React)
    ↓
ipc-adapter.ts  →  IS_TAURI?
    ├── YES → tauri-commands.ts → invoke() → Rust commands
    └── NO  → mock-ipc.ts → in-memory (web preview)
```

- **Web preview:** Uses `mock-ipc.ts` with in-memory data (current Lovable preview)
- **Native app:** Uses `tauri-commands.ts` calling Rust backend via `@tauri-apps/api/core`

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `cargo tauri dev` not found | `cargo install tauri-cli --version "^2"` |
| WebView2 missing (Windows) | Download from [Microsoft](https://developer.microsoft.com/microsoft-edge/webview2/) |
| Blank window | Check Vite is running on port 8080 |
| SQLite lock errors | Close any other DB browser connected to the file |
| Missing platform libs (Linux) | Install all `apt` packages listed above |
| Rust compile errors | Run `rustup update` to get latest toolchain |

---

## Key Files

| File | Purpose |
|------|---------|
| `src-tauri/tauri.conf.json` | App config, window settings, CSP |
| `src-tauri/Cargo.toml` | Rust dependencies |
| `src-tauri/src/main.rs` | 10-step startup sequence |
| `src-tauri/src/commands/` | All IPC command handlers |
| `src-tauri/src/engine/` | Background alarm scheduler |
| `src-tauri/src/storage/` | SQLite DB layer |
| `src-tauri/src/migrations/` | SQL schema migrations |
| `src/lib/ipc-adapter.ts` | Frontend IPC routing |

---

## Next Steps After Setup

1. Run `cargo tauri dev` and verify alarms persist after restart
2. Test notifications on your platform
3. Test audio playback with alarm sounds
4. Verify system tray icon appears
5. Build release package for your platform
