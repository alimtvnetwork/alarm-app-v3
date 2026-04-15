# Contributing to Alarm App

Thank you for your interest in contributing! This guide covers development workflow, code conventions, and PR requirements.

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 20+ | [nodejs.org](https://nodejs.org) |
| Rust | 1.75+ | [rustup.rs](https://rustup.rs) |
| Tauri CLI | 2.x | `cargo install tauri-cli --version "^2"` |

See [Local Setup Guide](spec/15-alarm-app/04-guides/01-tauri-local-setup-guide.md) for platform-specific dependencies.

---

## Development Workflow

### 1. Fork & Clone

```bash
git clone https://github.com/YOUR_USERNAME/alarm-app.git
cd alarm-app
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start Development

```bash
# Web preview (frontend only)
npm run dev

# Native app (frontend + Rust backend)
cargo tauri dev
```

### 4. Run Tests

```bash
# Frontend tests
npm test

# Rust tests
cd src-tauri && cargo test
```

### 5. Lint

```bash
# Frontend
npm run lint

# Rust
cd src-tauri && cargo clippy -- -D warnings
cd src-tauri && cargo fmt --check
```

---

## Code Style

### TypeScript / React

- **Components**: One component per file, PascalCase filename matching export
- **Max file size**: ~150 lines per component — extract sub-components when larger
- **State management**: Zustand stores in `src/stores/`
- **IPC calls**: Always through `src/lib/ipc-adapter.ts` — never import mock-ipc or tauri-commands directly
- **Styling**: Tailwind CSS semantic tokens only — no hardcoded colors (`bg-red-500` ❌, `bg-destructive` ✅)
- **Types**: All types in `src/types/` — PascalCase for type names and properties

### Rust

- **Formatting**: `cargo fmt` (enforced in CI)
- **Linting**: `cargo clippy -- -D warnings` (enforced in CI)
- **Error handling**: Use `AlarmAppError` enum from `src-tauri/src/errors.rs`
- **Database naming**: PascalCase for SQLite column/table names, snake_case for Rust variables
- **Commands**: Each domain gets its own file in `src-tauri/src/commands/`

### General

- No magic strings or numbers — use constants or enums
- Boolean variables prefixed with `is`, `has`, `should`, `can`
- Prefer early returns over nested if/else
- Max 15 lines per function where practical

---

## Project Architecture

```
Frontend (React) ←→ IPC Adapter ←→ Rust Backend ←→ SQLite
                         ↓
              IS_TAURI? → tauri-commands.ts (native)
                        → mock-ipc.ts (web preview)
```

### Key Principle

The frontend is backend-agnostic. All data access goes through `ipc-adapter.ts`, which routes to either:
- **`tauri-commands.ts`** — real Rust backend via Tauri `invoke()`
- **`mock-ipc.ts`** — in-memory mock for web development/preview

Never bypass the adapter.

---

## Adding a New Feature

### Frontend Only

1. Create component(s) in `src/components/your-feature/`
2. Add types to `src/types/alarm.ts`
3. Add IPC functions to `src/lib/ipc-adapter.ts`
4. Add mock implementation to `src/lib/mock-ipc.ts`
5. Add tests in `src/test/`
6. Add translations to `src/i18n/locales/`

### Full-Stack (with Rust backend)

All of the above, plus:

7. Add Rust command handler in `src-tauri/src/commands/`
8. Add Tauri command wrapper in `src/lib/tauri-commands.ts`
9. Register command in `src-tauri/src/main.rs`
10. Add SQL migration if new tables needed in `src-tauri/src/migrations/`
11. Add Rust models in `src-tauri/src/storage/models.rs`

---

## Commit Conventions

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add bedtime reminder notification
fix: alarm not firing after timezone change
refactor: extract ThemeSelector from Personalization
docs: update CI/CD guide with signing instructions
test: add edge-case tests for snooze expiry
chore: bump tauri to 2.10.3
```

---

## Pull Request Checklist

Before submitting a PR, ensure:

- [ ] `npm test` passes (all 117+ tests)
- [ ] `npm run lint` passes
- [ ] `npm run build` succeeds
- [ ] `cd src-tauri && cargo clippy -- -D warnings` passes (if Rust changed)
- [ ] `cd src-tauri && cargo fmt --check` passes (if Rust changed)
- [ ] New features have tests
- [ ] New UI strings have i18n translations
- [ ] No hardcoded colors — use semantic tokens
- [ ] Components under 150 lines
- [ ] CHANGELOG.md updated for user-facing changes
- [ ] Version bumped in `tauri.conf.json` and `Cargo.toml` (for releases)

---

## Versioning

This project follows [Semantic Versioning](https://semver.org/):

- **MAJOR**: Breaking changes to data format or IPC contract
- **MINOR**: New features, non-breaking additions
- **PATCH**: Bug fixes, documentation updates

Version must be updated in both:
- `src-tauri/tauri.conf.json` → `"version"`
- `src-tauri/Cargo.toml` → `version`

---

## Getting Help

- Check existing [spec documentation](spec/15-alarm-app/)
- Review the [guides](spec/15-alarm-app/04-guides/)
- Open an issue for bugs or feature requests
