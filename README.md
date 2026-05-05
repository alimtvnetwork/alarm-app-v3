![Alarm App icon](https://raw.githubusercontent.com/alimtvnetwork/alarm-app-v3/main/assets/icon.png)

# ⏰ Alarm App

**A warm, minimal cross-platform desktop alarm clock — wake up better, sleep smarter**

[![CI](https://github.com/alimtvnetwork/alarm-app-v3/actions/workflows/ci.yml/badge.svg)](https://github.com/alimtvnetwork/alarm-app-v3/actions/workflows/ci.yml)
[![Release](https://github.com/alimtvnetwork/alarm-app-v3/actions/workflows/release.yml/badge.svg)](https://github.com/alimtvnetwork/alarm-app-v3/actions/workflows/release.yml)
[![GitHub Release](https://img.shields.io/github/v/release/alimtvnetwork/alarm-app-v3?style=flat-square&label=version)](https://github.com/alimtvnetwork/alarm-app-v3/releases)
[![Downloads](https://img.shields.io/github/downloads/alimtvnetwork/alarm-app-v3/total?style=flat-square&label=downloads&color=success)](https://github.com/alimtvnetwork/alarm-app-v3/releases)
[![Tauri](https://img.shields.io/badge/Tauri-2.x-FFC131?style=flat-square&logo=tauri&logoColor=black)](https://tauri.app/)
[![Rust](https://img.shields.io/badge/Rust-1.77+-CE412B?style=flat-square&logo=rust&logoColor=white)](https://www.rust-lang.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind](https://img.shields.io/badge/Tailwind-3-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20Linux%20%7C%20macOS-lightgrey?style=flat-square)](https://github.com/alimtvnetwork/alarm-app-v3)
[![SQLite](https://img.shields.io/badge/SQLite-WAL-003B57?style=flat-square&logo=sqlite&logoColor=white)](https://www.sqlite.org/)
[![Last commit](https://img.shields.io/github/last-commit/alimtvnetwork/alarm-app-v3?style=flat-square)](https://github.com/alimtvnetwork/alarm-app-v3/commits/main)
[![Code size](https://img.shields.io/github/languages/code-size/alimtvnetwork/alarm-app-v3?style=flat-square)](https://github.com/alimtvnetwork/alarm-app-v3)
[![Open issues](https://img.shields.io/github/issues/alimtvnetwork/alarm-app-v3?style=flat-square)](https://github.com/alimtvnetwork/alarm-app-v3/issues)
[![Stars](https://img.shields.io/github/stars/alimtvnetwork/alarm-app-v3?style=flat-square&logo=github)](https://github.com/alimtvnetwork/alarm-app-v3/stargazers)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat-square)](CONTRIBUTING.md)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)

_Set alarms with smart repeat patterns, dismiss them with challenges, track your sleep, and wake up with gradual volume — all from a tiny native desktop app that lives in your tray._

![Alarm App firing an alarm with snooze and dismiss controls](https://raw.githubusercontent.com/alimtvnetwork/alarm-app-v3/main/assets/screenshots/alarm-firing.gif)
↑ One app, one binary — schedule, snooze, dismiss, and never miss a wake-up again.

![Alarm App main dashboard with analog clock and alarm list](https://raw.githubusercontent.com/alimtvnetwork/alarm-app-v3/main/assets/screenshots/dashboard-preview.png)
↑ Warm, minimal dashboard — analog + digital clock, today's alarms, daily quote, and one-tap groups.

**🚀 Install in 10 seconds — anyone, any OS:**

|     |     |
| --- | --- |
| **🪟 Windows · PowerShell** | <pre>irm https://raw.githubusercontent.com/alimtvnetwork/alarm-app-v3/main/install.ps1 \| iex</pre> |
| **🐧 macOS · Linux · Bash** | <pre>curl -fsSL https://raw.githubusercontent.com/alimtvnetwork/alarm-app-v3/main/install.sh \| bash</pre> |

Auto-detects your OS & architecture · Installs the latest pre-built binary (`.msi`, `.dmg`, `.AppImage`) · Falls back to a source build if no release is published · See [Installation](#installation) for flags, pinned versions, and SHA-256 verification.

---

## 💡 Why this exists

If you've ever **slept through three "smart" phone alarms** in a row — or watched a bloated 200 MB Electron alarm app eat your battery just to ring once a day — you know the pain: cluttered UIs, buried settings, alarms that silently fail after a system sleep, and "snooze forever" buttons that defeat the whole point.

**Alarm App was built out of that frustration.** It's a tiny native desktop app (≈ 5 MB, Tauri + Rust) that schedules alarms in a real OS background service, survives sleep/wake cycles, plays audio through your system mixer, fires native notifications, and forces you to actually **solve a math problem or shake your mouse** before it stops ringing. Your alarms live in a local SQLite file on your own disk — no cloud, no account, no telemetry — and the whole app starts in under a second.

---

## ✨ Highlights

- ⏰ **Smart scheduling** — once, daily, weekly, custom interval, or full cron expressions — all computed in Rust and re-armed automatically across timezone changes
- 🔊 **Native audio + gradual volume** — built-in sounds or your own `.mp3` / `.wav`, fading from whisper to wake-up over a configurable ramp
- 💪 **Dismiss challenges** — math problem, type-a-phrase, or shake-the-mouse to stop the alarm; configurable per alarm so you can't half-asleep tap "snooze"
- 🗂️ **Groups & drag-drop** — color-coded groups (Workdays, Weekend, Naps), one-tap enable/disable a whole group, drag to reorder
- 🌙 **Dark mode + warm minimal theme** — cream-and-tan light palette, charcoal-and-cream dark palette, all WCAG 2.1 AA
- 📦 **Single ~5 MB native binary** — Tauri 2.x (Rust backend, OS WebView frontend) — no Electron, no 200 MB Chromium runtime
- 🗃️ **SQLite (WAL)** — fast, durable, zero-config local database with soft-delete, undo, and full alarm history
- 🛌 **Sleep & wellness tools** — bedtime reminder, sleep calculator, streak tracker, ambient sound player, daily quote
- ⌨️ **Keyboard shortcuts everywhere** — `N` new alarm, `/` search, `?` shortcut overlay, `Cmd/Ctrl + K` command palette
- 🌐 **i18n out of the box** — English, Bengali, Japanese, Malay, Chinese (5 locales shipped)
- 🔒 **Cross-platform native** — Windows, Linux, macOS on `amd64` and `arm64`; iOS / Android on the roadmap
- 🛡️ **100% local & private** — no account, no cloud sync, no analytics; export/import your alarms as JSON / CSV / iCal whenever you want

---

## 📑 Table of Contents

- [Quick Start](#quick-start)
- [Sample setup used in this README](#sample-setup-used-in-this-readme)
- [Pre-flight checklist](#-pre-flight-checklist)
- [Jump to a feature](#jump-to-a-feature)
- [Demo](#-demo)
- [Installation](#installation)
- [What It Does](#what-it-does)
- [Feature Reference](#feature-reference)
  - [⏰ Alarms & Library](#-alarms--library)
  - [🔔 Firing & Dismissal](#-firing--dismissal)
  - [↩️ History & Undo](#-history--undo)
  - [🎯 Discovery & Organization](#-discovery--organization)
  - [🛠️ Maintenance & Debugging](#-maintenance--debugging)
  - [⚙️ Configuration & Settings](#-configuration--settings)
- [Troubleshooting](#troubleshooting)
- [Feature Tree](#feature-tree)
- [Build & Deploy](#build--deploy)
- [Release Workflow](#release-workflow)
- [Project Structure](#project-structure)
- [Data Storage](#data-storage)
- [Documentation Sync](#documentation-sync)
- [Milestones](#milestones)
- [Dependencies](#dependencies)
- [Contributing](#-contributing)
- [Author](#author)
- [License](#license)

---


## Build & Run Scripts

Cross-platform build scripts with auto-install, force-clean, Tauri desktop builds, and configuration via `powershell.json`. **Use these to build the app from source — start here if you cloned the repo.**

### Usage

**Windows (PowerShell):**

```powershell
.\run.ps1 [flags]
```

**Linux / macOS (Bash):**

```bash
./run.sh [flags]
```

### Flags

**Windows (PowerShell):**

| Flag | Description | Example |
|------|-------------|---------|
| `-h` | Show help | `.\run.ps1 -h` |
| `-i` | Install/update all dependencies | `.\run.ps1 -i` |
| `-b` | Build only (production), don't start dev server | `.\run.ps1 -b` |
| `-s` | Skip build, just start dev server | `.\run.ps1 -s` |
| `-f` | Force clean (remove node_modules, dist, caches) | `.\run.ps1 -f` |
| `-r` | Clean reinstall + build (`-f` + `-i`) | `.\run.ps1 -r` |
| `-p` | Skip git pull | `.\run.ps1 -p` |
| `-t` | Build Tauri desktop app | `.\run.ps1 -t` |
| `-td` | Run Tauri dev mode (hot-reload) | `.\run.ps1 -td` |
| `-v` | Verbose debug output | `.\run.ps1 -v` |

**Linux / macOS (Bash):**

| Flag | Description | Example |
|------|-------------|---------|
| `-h` | Show help | `./run.sh -h` |
| `-i` | Install/update all dependencies | `./run.sh -i` |
| `-b` | Build only (production), don't start dev server | `./run.sh -b` |
| `-s` | Skip build, just start dev server | `./run.sh -s` |
| `-f` | Force clean (remove node_modules, dist, caches) | `./run.sh -f` |
| `-r` | Clean reinstall + build (`-f` + `-i`) | `./run.sh -r` |
| `-p` | Skip git pull | `./run.sh -p` |
| `-t` | Build Tauri desktop app | `./run.sh -t` |
| `-d` | Run Tauri dev mode (hot-reload) | `./run.sh -d` |
| `-v` | Verbose debug output | `./run.sh -v` |

### Examples

**Fresh setup (first time):**

```powershell
.\run.ps1 -i           # Install everything, then exit
.\run.ps1              # Build + start dev server
```

**Force clean rebuild:**

```powershell
.\run.ps1 -r           # Remove node_modules/dist, reinstall, build
```

**Production build only:**

```powershell
.\run.ps1 -b           # Build to dist/, don't start server
```

**Tauri desktop app:**

```powershell
.\run.ps1 -t           # Build native desktop app
.\run.ps1 -td          # Hot-reload Tauri dev mode
```

### What the scripts do

The build scripts run a 5-step pipeline:

| Step | Action |
|------|--------|
| 1 | **Git pull** — pulls latest changes (skip with `-p`) |
| 2 | **Prerequisites** — checks/auto-installs Node.js, Rust, Tauri CLI |
| 3 | **Build** — runs `npm run build` (or Tauri build with `-t`) |
| 4 | **Config** — copies `.env.example` → `.env` if missing |
| 5 | **Dev server** — starts `npm run dev` on port 8080 |

### Configuration

All settings are driven by `powershell.json` — no need to edit the scripts:

```json
{
  "projectName": "Alarm App",
  "frontendDir": ".",
  "buildCommand": "npm run build",
  "runCommand": "npm run dev",
  "ports": [8080],
  "cleanPaths": ["node_modules", "dist", ".vite"],
  "prerequisites": {
    "node": true,
    "rust": false,
    "tauri": false
  }
}
```

### Auto-Install

The scripts automatically install missing prerequisites:

| Tool | Windows | macOS | Linux |
|------|---------|-------|-------|
| Node.js | `winget` | `brew` | Manual |
| Rust | `winget` → `rustup` | `rustup` | `rustup` |
| Tauri CLI | `npm install -D @tauri-apps/cli` | Same | Same |
| Xcode CLT | — | `xcode-select --install` | — |
| System libs | — | — | `apt install` (webkit, etc.) |

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |
| `npm run test` | Run Vitest tests |
| `npm run test:watch` | Run Vitest in watch mode |

---

## What It Does

A feature-rich cross-platform desktop alarm clock with smart scheduling, multiple dismissal modes, and sleep wellness tools. Every alarm supports **all features** automatically:

- **Clock Display** — analog + digital clock with flip-clock animations
- **Alarm Management** — create, edit, delete, toggle, duplicate, drag-to-reorder
- **Repeat Patterns** — Once, Daily, Weekly scheduling
- **Alarm Tones** — 4 tones with gradual volume ramp (native `rodio` audio)
- **Dismissal Challenges** — Math, Typing & Shake challenges to prevent oversleeping
- **Snooze** — configurable duration and max snooze count
- **Notifications** — OS-native notifications via `tauri-plugin-notification`
- **Sleep Tracking** — bedtime reminders, ambient sounds, sleep analytics
- **Analytics Dashboard** — streak tracking, sleep quality insights
- **Theming** — light/dark/system, 12 skin themes, 6 accent colors
- **Internationalization** — EN, MS, ZH, JA, BN language support
- **System Tray** — minimize to tray, background operation
- **Auto-Updater** — built-in updates with Ed25519 signature verification
- **SQLite Database** — persistent storage with WAL mode

---

## Feature Reference

### Alarm Management

| Feature | Description |
|---------|-------------|
| Create / Edit | Set time, label, tone, repeat, snooze, and challenge |
| Toggle | Enable / disable alarms without deleting |
| Duplicate | Clone an existing alarm with one tap |
| Drag Reorder | Rearrange alarm order via drag-and-drop |
| Delete | Remove alarms with confirmation |

---

### Repeat Patterns

| Pattern | Behavior |
|---------|----------|
| Once | Fires once, then auto-disables |
| Daily | Fires every day at the set time |
| Weekly | Fires on selected days of the week |

---

### Alarm Tones

4 built-in alarm tones played via native `rodio` audio engine — no browser required.

| Tone | Description |
|------|-------------|
| Classic Beep | Traditional alarm beep pattern |
| Gentle Chime | Soft ascending tones |
| Nature Birds | Natural birdsong sounds |
| Digital Pulse | Modern pulsing alert |

All tones support **gradual volume ramp** for a gentler wake-up experience.

---

### Dismissal Challenges

| Challenge | Description |
|-----------|-------------|
| Math | Solve arithmetic problems to dismiss |
| Typing | Type a displayed phrase accurately |

Challenges prevent accidental dismissal and help ensure you're fully awake.

---

### Snooze

| Setting | Description |
|---------|-------------|
| Duration | Configurable snooze interval (minutes) |
| Max Count | Limit on consecutive snoozes per alarm |

---

### Sleep Tools

| Feature | Description |
|---------|-------------|
| Bedtime Reminder | Notification to start winding down |
| Ambient Sounds | Background audio for better sleep |
| Sleep Tracking | Log and review sleep patterns |

---

### Skin Themes

11 built-in color themes for full UI customization:

| Theme | Description |
|-------|-------------|
| Default | Clean warm minimal design |
| Rose | Soft pink tones |
| Ocean | Deep blue palette |
| Forest | Natural green theme |
| Sunset | Warm orange gradients |
| Midnight | Dark purple tones |
| VS Code | Developer-inspired dark theme |
| Dracula | Classic Dracula color scheme |
| Monokai | Monokai Pro-inspired palette |
| Nord | Arctic, north-bluish clean theme |
| Solarized Dark | Ethan Schoonover's dark variant |
| Solarized Light | Ethan Schoonover's light variant |

---

### Internationalization

| Language | Code |
|----------|------|
| English | `en` |
| Malay | `ms` |
| Chinese | `zh` |
| Japanese | `ja` |

---

## Testing Alarms Locally

1. Navigate to **/alarms** and create a new alarm
2. Set the time to 1–2 minutes from now
3. The **Debug Panel** (dev mode only) at the bottom shows:
   - Your configured timezone
   - Local time vs UTC
   - Each alarm's computed `NextFireTime`
   - A "⚡ DUE" indicator when an alarm is past due
4. When the alarm fires:
   - Full-screen overlay with snooze/dismiss buttons
   - Audio tone plays (oscillator-based)
   - OS notification appears (if permission granted)
5. Allow browser notification permission when prompted

---

## Production Build

```bash
npm run build
```

Output goes to `dist/`. Serve with any static file server:

```bash
npm run preview          # Vite's built-in preview server
# — or —
npx serve dist           # Using the 'serve' package
```

---

## Project Structure

```
src/                              # Frontend (React)
├── components/                   # React components
│   ├── alarm/                    # AlarmCard, AlarmForm, AlarmOverlay
│   ├── clock/                    # AnalogClock, DigitalTime
│   ├── sleep/                    # BedtimeReminder, AmbientPlayer
│   ├── personalization/          # ThemeSelector, SkinSelector, AccentColorPicker
│   ├── settings/                 # AlarmDefaultsSection, DisplaySection, etc.
│   ├── errors/                   # ErrorRow, ErrorDetailModal
│   └── ui/                       # shadcn/ui primitives
├── lib/                          # Utilities
│   ├── ipc-adapter.ts            # Dual-path IPC (mock ↔ Tauri)
│   ├── tauri-commands.ts         # Native Tauri invoke wrappers
│   ├── mock-ipc.ts               # Web preview mock backend
│   └── next-fire-time.ts         # NextFireTime computation
├── stores/                       # Zustand stores (alarm, overlay, settings, error)
├── pages/                        # Route pages
├── types/                        # TypeScript interfaces & enums
└── i18n/                         # Translation files

src-tauri/                        # Backend (Rust)
├── src/
│   ├── main.rs                   # 10-step startup sequence
│   ├── commands/                 # 30+ IPC command handlers
│   ├── engine/                   # Alarm scheduler, wake listener, timezone watcher
│   ├── storage/                  # SQLite DB layer, models
│   ├── tray/                     # System tray setup
│   └── errors.rs                 # Error types
├── migrations/                   # SQLite migrations (V1–V3)
├── Cargo.toml                    # Rust dependencies
└── tauri.conf.json               # App configuration
```

---

## Data Persistence

Uses **SQLite** with WAL mode via `rusqlite`. Database stored in the OS app data directory. In web preview mode, uses in-memory mock data via `mock-ipc.ts`.

---

## Tech Stack

| Technology | Purpose |
|------------|---------|
| **Tauri 2.x** | Native app framework (Rust backend + WebView) |
| **Rust** | Backend: alarm engine, audio, notifications, storage |
| **SQLite** | Persistent database (rusqlite + refinery migrations) |
| **React 18** | UI framework |
| **TypeScript 5** | Type safety |
| **Vite 5** | Build tool & dev server |
| **Tailwind CSS v3** | Utility-first styling |
| **Zustand** | State management |
| **shadcn/ui** | Component library |
| **rodio** | Native audio playback |
| **tokio** | Async runtime for background tasks |

---

## Author

### [Abdullah-Al-Mahin](https://github.com/ab-mahin)

**Developer** | Under the mentorship of [Md. Alim Ul Karim](https://www.google.com/search?q=alim+ul+karim)

|  |  |
|---|---|
| **GitHub** | [github.com/ab-mahin](https://github.com/ab-mahin) |
| **LinkedIn** | [linkedin.com/in/ab-mahin0](https://www.linkedin.com/in/ab-mahin0/) |
| **Facebook** | [abmahin624460](https://www.facebook.com/abmahin624460/) |
| **Codeforces** | [codeforces.com/profile/Ab-Mahin](https://codeforces.com/profile/Ab-Mahin) |

---

### [Md. Alim Ul Karim](https://www.google.com/search?q=alim+ul+karim)

**[Mentor & Architect](https://alimkarim.com/)** | [Chief Software Engineer](https://www.google.com/search?q=alim+ul+karim), [Riseup Asia LLC](https://riseup-asia.com/)

A system architect with **20+ years** of professional software engineering experience across enterprise, fintech, and distributed systems. His technology stack spans **.NET/C# (18+ years)**, **JavaScript (10+ years)**, **TypeScript (6+ years)**, and **Golang (4+ years)**.

Recognized as a **top 1% talent at Crossover** and one of the top software architects globally. He is also the **Chief Software Engineer of [Riseup Asia LLC](https://riseup-asia.com/)** and maintains an active presence on **[Stack Overflow](https://stackoverflow.com/users/513511/md-alim-ul-karim)** (2,452+ reputation, member since 2010) and **LinkedIn** (12,500+ followers).

|  |  |
|---|---|
| **Website** | [alimkarim.com](https://alimkarim.com/) · [my.alimkarim.com](https://my.alimkarim.com/) |
| **LinkedIn** | [linkedin.com/in/alimkarim](https://my.linkedin.com/in/alimkarim) |
| **Stack Overflow** | [stackoverflow.com/users/513511/md-alim-ul-karim](https://stackoverflow.com/users/513511/md-alim-ul-karim) |
| **Google** | [Alim Ul Karim](https://www.google.com/search?q=Alim+Ul+Karim) |
| **Role** | Chief Software Engineer, [Riseup Asia LLC](https://riseup-asia.com/) |

---

### Riseup Asia LLC

[Top Leading Company in Wyoming 2026](https://riseup-asia.com/)

|  |  |
|---|---|
| **Website** | [riseup-asia.com](https://riseup-asia.com/) |
| **Facebook** | [riseupasia.talent](https://www.facebook.com/riseupasia.talent/) |
| **LinkedIn** | [Riseup Asia](https://www.linkedin.com/company/105304484/) |
| **YouTube** | [@riseup-asia](https://www.youtube.com/@riseup-asia) |

---

## License

Private — all rights reserved.
