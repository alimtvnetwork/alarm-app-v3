# Changelog

All notable changes to the Alarm App will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] — 2026-04-15

### Added
- **Tauri 2.x native backend** — Full Rust backend with SQLite, alarm engine, system tray
- **SQLite database** — 7 tables, 3 migrations, WAL mode, replaces IndexedDB
- **Background alarm scheduler** — 30-second polling Rust thread with OS-native notifications
- **Native audio** — `rodio` crate for alarm sound playback
- **System tray** — Minimize to tray, quick actions
- **Wake listener** — Platform-specific sleep/wake detection (macOS, Windows, Linux)
- **Timezone watcher** — Automatic alarm recalculation on timezone change
- **Auto-updater** — `tauri-plugin-updater` with Ed25519 signature verification
- **CI/CD pipeline** — GitHub Actions for multi-platform builds (macOS, Windows, Linux)
- **12 skin themes** — Default, Midnight, Sunrise, Ocean, Forest, VS Code, Dracula, Monokai, Nord, Solarized Dark/Light, Catppuccin
- **6 accent colors** — Warm Brown, Indigo, Emerald, Amber, Red, Violet
- **5 languages** — English, Bahasa Melayu, Chinese, Japanese, Bangla
- **Export/Import** — JSON export with native file dialogs
- **Dismissal challenges** — Math, Shake, Typing challenges with difficulty levels
- **Sleep wellness** — Bedtime calculator, sleep quality tracking, ambient sounds
- **Streak calendar** — Visual wake-up streak tracking
- **Motivational quotes** — Daily quotes with CRUD management
- **Alarm groups** — Group alarms with batch toggle
- **Error capture system** — Structured error logging with severity filtering

### Changed
- **IPC adapter** — Dual-path architecture: mock-ipc for web preview, tauri-commands for native
- **Settings page** — Refactored into 6 focused section components
- **Personalization page** — Refactored into 4 focused components
- **Error log page** — Extracted ErrorRow, ErrorDetailModal, severity-config

### Technical
- **117 tests** passing across 16 test files
- **30+ IPC commands** implemented in Rust
- **Comprehensive spec** — 14 feature specs, 10 fundamentals, 4 guides
- **Platform-specific code** — macOS (objc2), Windows (Win32), Linux (zbus)

## [1.0.0] — 2026-03-01

### Added
- Initial web app release
- Alarm CRUD with time picker
- Snooze system with configurable duration and max count
- Repeat patterns (once, daily, weekly)
- Sound selection with preview
- Gradual volume ramp
- 24-hour / 12-hour clock toggle
- Light / Dark / System theme modes
- Flip clock display
