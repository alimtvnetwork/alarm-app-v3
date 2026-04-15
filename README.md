# Alarm App

A warm, minimal alarm clock web app with smart scheduling, sleep tools, and wellness tracking.

Built with **React 18 · TypeScript · Vite 5 · Tailwind CSS · Zustand · shadcn/ui**.

---

## Quick Start

### Install

```powershell
# Windows (PowerShell)
.\run.ps1 -i
```

```bash
# Linux / macOS
./run.sh -i
```

### Build and run

```powershell
# Windows (PowerShell)
.\run.ps1
```

```bash
# Linux / macOS
./run.sh
```

The app will open at **http://localhost:8080**.

---

## Build & Run Scripts

Cross-platform build scripts with auto-install, force-clean, Tauri desktop builds, and configuration via `powershell.json`.

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

## Installer Scripts

Pre-built installer scripts for distributing release binaries. Located in `scripts/`.

### One-Liner Install

**Windows (PowerShell):**

```powershell
irm https://github.com/alimtvnetwork/alarm-app/releases/latest/download/install.ps1 | iex
```

**Linux / macOS (Bash):**

```bash
curl -fsSL https://github.com/alimtvnetwork/alarm-app/releases/latest/download/install.sh | bash
```

### What the installers do

1. Detect platform and architecture (x64 / arm64)
2. Download the correct release asset (`.msi`, `.dmg`, or `.AppImage`)
3. Verify SHA-256 checksum
4. Install to the default location
5. Clean up temporary files

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

A feature-rich alarm clock PWA with smart scheduling, multiple dismissal modes, and sleep wellness tools. Every alarm supports **all features** automatically:

- **Clock Display** — analog + digital clock with flip-clock animations
- **Alarm Management** — create, edit, delete, toggle, duplicate, drag-to-reorder
- **Repeat Patterns** — Once, Daily, Weekly scheduling
- **Alarm Tones** — 4 oscillator-based tones with gradual volume ramp
- **Dismissal Challenges** — Math & Typing challenges to prevent oversleeping
- **Snooze** — configurable duration and max snooze count
- **Notifications** — OS-level browser notifications (background tab support)
- **Sleep Tracking** — bedtime reminders, ambient sounds, sleep analytics
- **Analytics Dashboard** — streak tracking, sleep quality insights
- **Theming** — light/dark/system, 11 skin themes, accent color picker
- **Internationalization** — EN, MS, ZH, JA language support
- **PWA** — installable as progressive web app (Add to Dock on macOS)
- **Timezone-aware** — defaults to Asia/Kuala_Lumpur

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

4 built-in oscillator-based tones generated via Web Audio API — no audio files required.

| Tone | Description |
|------|-------------|
| Classic | Traditional alarm beep pattern |
| Gentle | Soft ascending tones |
| Urgent | Rapid pulsing alert |
| Musical | Melodic sequence |

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
src/
├── components/           # React components
│   ├── alarm/            # AlarmCard, AlarmForm, AlarmOverlay, AlarmChecker
│   ├── clock/            # AnalogClock, DigitalTime
│   ├── sleep/            # BedtimeReminder, AmbientPlayer
│   ├── analytics/        # StatCard, chart tabs, data hooks
│   └── ui/               # shadcn/ui primitives
├── lib/                  # Utilities
│   ├── alarm-audio.ts            # Web Audio oscillator tones
│   ├── alarm-notification.ts     # Browser Notification API
│   ├── alarm-timezone.ts         # Timezone normalization
│   ├── next-fire-time.ts         # NextFireTime computation
│   ├── mock-ipc.ts               # localStorage persistence layer
│   └── ...
├── pages/                # Route pages (Index, Alarms, Sleep, Analytics, Settings)
├── stores/               # Zustand stores (alarm, overlay, settings)
├── types/                # TypeScript interfaces & enums
├── test/                 # Test fixtures
└── i18n/                 # Translation files
```

---

## Data Persistence

Currently uses **localStorage** — data persists in-browser but is not synced across devices. Clearing browser data will reset all alarms and settings.

---

## Tech Stack

| Technology | Purpose |
|------------|---------|
| React 18 | UI framework |
| TypeScript 5 | Type safety |
| Vite 5 | Build tool & dev server |
| Tailwind CSS v3 | Utility-first styling |
| Zustand | State management |
| shadcn/ui | Component library |
| Web Audio API | Alarm tone generation |
| Notification API | OS-level alerts |

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
