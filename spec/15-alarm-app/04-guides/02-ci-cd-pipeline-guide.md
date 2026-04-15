# CI/CD Pipeline Guide — Tauri Multi-Platform Builds

**Version:** 1.1.0  
**Updated:** 2026-04-15  
**Status:** Active

---

## Overview

This guide covers setting up GitHub Actions to automatically build the Alarm App for macOS, Windows, and Linux on every release tag.

---

## Prerequisites

| Item | Purpose |
|------|---------|
| GitHub repository | Hosts code and Actions workflows |
| Apple Developer certificate | macOS code signing (.p12) |
| Windows code signing cert | Optional, for EV/OV signing |
| Tauri updater key pair | For auto-update signature verification |

---

## Workflow File

Create `.github/workflows/release.yml`:

```yaml
name: Release

on:
  push:
    tags:
      - "v*"

concurrency:
  group: release-${{ github.ref }}
  cancel-in-progress: true

jobs:
  build:
    strategy:
      fail-fast: false
      matrix:
        include:
          - platform: macos-latest
            target: aarch64-apple-darwin
            label: macOS-arm64
          - platform: macos-latest
            target: x86_64-apple-darwin
            label: macOS-x64
          - platform: windows-latest
            target: x86_64-pc-windows-msvc
            label: Windows-x64
          - platform: ubuntu-22.04
            target: x86_64-unknown-linux-gnu
            label: Linux-x64

    runs-on: ${{ matrix.platform }}
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Install Rust
        uses: dtolnay/rust-toolchain@stable
        with:
          targets: ${{ matrix.target }}

      - name: Install Linux dependencies
        if: matrix.platform == 'ubuntu-22.04'
        run: |
          sudo apt-get update
          sudo apt-get install -y \
            libwebkit2gtk-4.1-dev \
            build-essential \
            curl wget file \
            libxdo-dev \
            libssl-dev \
            libayatana-appindicator3-dev \
            librsvg2-dev

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install frontend dependencies
        run: npm ci

      - name: Rust cache
        uses: swatinem/rust-cache@v2
        with:
          workspaces: src-tauri -> target

      - name: Build Tauri app
        uses: tauri-apps/tauri-action@v0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          # macOS signing
          APPLE_CERTIFICATE: ${{ secrets.APPLE_CERTIFICATE }}
          APPLE_CERTIFICATE_PASSWORD: ${{ secrets.APPLE_CERTIFICATE_PASSWORD }}
          APPLE_SIGNING_IDENTITY: ${{ secrets.APPLE_SIGNING_IDENTITY }}
          APPLE_ID: ${{ secrets.APPLE_ID }}
          APPLE_PASSWORD: ${{ secrets.APPLE_PASSWORD }}
          APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
          # Tauri updater signing
          TAURI_SIGNING_PRIVATE_KEY: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY }}
          TAURI_SIGNING_PRIVATE_KEY_PASSWORD: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY_PASSWORD }}
        with:
          tagName: v__VERSION__
          releaseName: "Alarm App v__VERSION__"
          releaseBody: "See the [changelog](https://github.com/user/repo/blob/main/CHANGELOG.md) for details."
          releaseDraft: true
          prerelease: false
          args: --target ${{ matrix.target }}

  # Universal macOS binary (optional)
  universal-macos:
    needs: build
    runs-on: macos-latest
    if: startsWith(github.ref, 'refs/tags/v')
    steps:
      - name: Download macOS artifacts
        uses: actions/download-artifact@v4
        with:
          pattern: "*macOS*"
          merge-multiple: true
      
      - name: Create universal binary
        run: |
          echo "Universal binary creation would go here"
          echo "Use lipo to combine arm64 and x64 binaries"
```

---

## Repository Secrets

Add these in **Settings → Secrets and variables → Actions**:

### Required

| Secret | Description |
|--------|-------------|
| `GITHUB_TOKEN` | Auto-provided by GitHub Actions |
| `TAURI_SIGNING_PRIVATE_KEY` | Generated via `cargo tauri signer generate` |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | Password for the signing key |

### macOS Code Signing (Required for distribution)

| Secret | Description |
|--------|-------------|
| `APPLE_CERTIFICATE` | Base64-encoded .p12 certificate |
| `APPLE_CERTIFICATE_PASSWORD` | .p12 password |
| `APPLE_SIGNING_IDENTITY` | e.g. `Developer ID Application: Your Name (TEAMID)` |
| `APPLE_ID` | Apple ID email for notarization |
| `APPLE_PASSWORD` | App-specific password |
| `APPLE_TEAM_ID` | 10-char team identifier |

### Encoding the Apple Certificate

```bash
base64 -i Certificates.p12 | pbcopy
# Paste the result as APPLE_CERTIFICATE secret
```

---

## Build Outputs

| Platform | Format | Path |
|----------|--------|------|
| macOS | `.dmg` | `src-tauri/target/release/bundle/dmg/` |
| macOS | `.app.tar.gz` | (for updater) |
| Windows | `.msi` | `src-tauri/target/release/bundle/msi/` |
| Windows | `.nsis` | `src-tauri/target/release/bundle/nsis/` |
| Linux | `.AppImage` | `src-tauri/target/release/bundle/appimage/` |
| Linux | `.deb` | `src-tauri/target/release/bundle/deb/` |

---

## Testing Workflow

### Local CI simulation

```bash
# Test the full build locally
cargo tauri build

# Test specific target
cargo tauri build --target aarch64-apple-darwin
```

### PR checks (add to `.github/workflows/ci.yml`)

```yaml
name: CI

on:
  pull_request:
    branches: [main]

jobs:
  check:
    runs-on: ubuntu-22.04
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable
      - name: Linux deps
        run: |
          sudo apt-get update
          sudo apt-get install -y libwebkit2gtk-4.1-dev build-essential \
            libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run build
      - run: cd src-tauri && cargo check
      - run: cd src-tauri && cargo clippy -- -D warnings
      - run: npm test
```

---

## Release Process

1. Update version in `src-tauri/tauri.conf.json` and `Cargo.toml`
2. Update `CHANGELOG.md`
3. Commit: `git commit -m "release: v1.2.0"`
4. Tag: `git tag v1.2.0`
5. Push: `git push origin main --tags`
6. GitHub Actions builds all platforms and creates a draft release
7. Review artifacts, then publish the release

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Linux build fails with missing libs | Ensure all `apt-get install` packages are listed |
| macOS notarization fails | Verify `APPLE_ID` and app-specific password |
| Windows MSI unsigned warning | Add EV/OV code signing certificate |
| Rust compilation slow | Enable `swatinem/rust-cache` (already in workflow) |
| `tauri-action` version mismatch | Pin to `@v0` for Tauri 2.x |

---

## Cross-References

| Reference | Location |
|-----------|----------|
| Local Setup Guide | `01-tauri-local-setup-guide.md` |
| Auto-Updater Guide | `03-auto-updater-guide.md` |
| Tauri Architecture | `../01-fundamentals/06-tauri-architecture-and-framework-comparison.md` |
