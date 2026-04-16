# Alarm App — Build & Run Script (PowerShell)
# Version: 1.0.0
# Frontend-only React/Vite project — no Go backend
# Configure via powershell.json
#
# USAGE:
#   .\run.ps1 -h    Show help
#   .\run.ps1 -i    Install all dependencies
#   .\run.ps1       Build and start dev server
#   .\run.ps1 -b    Build only (production)
#   .\run.ps1 -f    Force clean rebuild
#   .\run.ps1 -r    Clean reinstall + build (-f + -i)
#
# FLAGS:
#   -h   Show help
#   -b   Build only (production), don't start dev server
#   -s   Skip build, just start dev server
#   -p   Skip git pull
#   -f   Force clean (remove node_modules, dist, .vite)
#   -i   Install/update all dependencies
#   -r   Rebuild (combines -f + -i)
#   -t   Build Tauri desktop app
#   -td  Run Tauri dev mode
#   -v   Verbose output

param(
    [Alias('b')][switch]$buildonly,
    [Alias('s')][switch]$skipbuild,
    [Alias('p')][switch]$skippull,
    [Alias('f')][switch]$force,
    [Alias('i')][switch]$install,
    [Alias('r')][switch]$rebuild,
    [Alias('t')][switch]$tauri,
    [Alias('td')][switch]$tauridev,
    [Alias('h')][switch]$help,
    [Alias('v')][switch]$verbose
)

if ($rebuild) {
    $force = $true
    $install = $true
}

$ErrorActionPreference = "Stop"

# ============================================================================
# PATH RESOLUTION
# ============================================================================
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if ([string]::IsNullOrWhiteSpace($ScriptDir)) {
    $ScriptDir = Get-Location
}

# ============================================================================
# CONFIGURATION LOADING
# ============================================================================
$ConfigPath = Join-Path $ScriptDir "powershell.json"

if (-not (Test-Path $ConfigPath)) {
    Write-Host "ERROR: powershell.json not found at: $ConfigPath" -ForegroundColor Red
    exit 1
}

try {
    $Config = Get-Content $ConfigPath -Raw | ConvertFrom-Json
} catch {
    Write-Host "ERROR: Failed to parse powershell.json: $_" -ForegroundColor Red
    exit 1
}

function Resolve-RelativePath($Path) {
    if ([string]::IsNullOrWhiteSpace($Path) -or $Path -eq ".") {
        return $ScriptDir
    }
    if ($Path -match '^[A-Za-z]:' -or $Path -match '^\\\\') {
        return $Path -replace '/', '\'
    }
    return Join-Path $ScriptDir $Path
}

$ProjectName = if ($Config.projectName) { $Config.projectName } else { "Project" }
$RootDir = Resolve-RelativePath $Config.rootDir
$FrontendDir = Resolve-RelativePath $Config.frontendDir
$DistDir = if ($Config.distDir) { $Config.distDir } else { "dist" }
$Ports = if ($Config.ports) { $Config.ports } else { @(8080) }
$BuildCommand = if ($Config.buildCommand) { $Config.buildCommand } else { "npm run build" }
$InstallCommand = if ($Config.installCommand) { $Config.installCommand } else { "npm install" }
$RunCommand = if ($Config.runCommand) { $Config.runCommand } else { "npm run dev" }
$CleanPaths = if ($Config.cleanPaths) { $Config.cleanPaths } else { @("node_modules", "dist", ".vite") }
$ConfigFile = if ($Config.configFile) { $Config.configFile } else { ".env" }
$ConfigExampleFile = if ($Config.configExampleFile) { $Config.configExampleFile } else { ".env.example" }
$RequiredModules = if ($Config.requiredModules) { $Config.requiredModules } else { @() }
$PostBuildCommand = if ($Config.postBuildCommand) { $Config.postBuildCommand } else { "" }
$TauriBuildCommand = if ($Config.tauriBuildCommand) { $Config.tauriBuildCommand } else { "npm run tauri build" }
$TauriDevCommand = if ($Config.tauriDevCommand) { $Config.tauriDevCommand } else { "npm run tauri dev" }

$CheckNode = if ($null -ne $Config.prerequisites -and $null -ne $Config.prerequisites.node) { $Config.prerequisites.node } else { $true }
$CheckRust = if ($null -ne $Config.prerequisites -and $null -ne $Config.prerequisites.rust) { $Config.prerequisites.rust } else { $false }
$CheckTauri = if ($null -ne $Config.prerequisites -and $null -ne $Config.prerequisites.tauri) { $Config.prerequisites.tauri } else { $false }

if ($tauri -or $tauridev) {
    $CheckRust = $true
    $CheckTauri = $true
}

$TotalStopwatch = [System.Diagnostics.Stopwatch]::StartNew()

# ============================================================================
# UTILITY
# ============================================================================
function Format-ElapsedTime($Stopwatch) {
    $elapsed = $Stopwatch.Elapsed
    if ($elapsed.TotalMinutes -ge 1) {
        return "{0:N0}m {1:N1}s" -f [Math]::Floor($elapsed.TotalMinutes), $elapsed.Seconds
    } else {
        return "{0:N1}s" -f $elapsed.TotalSeconds
    }
}

function Test-Command($Command) {
    $oldPref = $ErrorActionPreference
    $ErrorActionPreference = 'SilentlyContinue'
    try { return $null -ne (Get-Command $Command -ErrorAction SilentlyContinue) }
    catch { return $false }
    finally { $ErrorActionPreference = $oldPref }
}

function Refresh-Path {
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" +
                [System.Environment]::GetEnvironmentVariable("Path", "User")
}

# ============================================================================
# AUTO-INSTALL FUNCTIONS
# ============================================================================
function Install-NodeJS {
    Write-Host "  Node.js not found. Attempting auto-install..." -ForegroundColor Yellow
    if (Test-Command "winget") {
        winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
        if ($LASTEXITCODE -ne 0) { throw "winget install failed" }
        Refresh-Path
        Write-Host "  ✓ Node.js installed" -ForegroundColor Green
    } elseif (Test-Command "brew") {
        brew install node@20
        Write-Host "  ✓ Node.js installed via Homebrew" -ForegroundColor Green
    } elseif (Test-Command "nvm") {
        nvm install --lts
        nvm use --lts
        Write-Host "  ✓ Node.js installed via nvm" -ForegroundColor Green
    } else {
        Write-Host "ERROR: Cannot auto-install Node.js. Install manually: https://nodejs.org/" -ForegroundColor Red
        exit 1
    }
}

function Install-Rust {
    Write-Host "  Rust not found. Attempting auto-install..." -ForegroundColor Yellow
    if ($IsMacOS -or $IsLinux) {
        # Check if rustup exists but rustc isn't in PATH
        $rustupBin = Join-Path $env:HOME ".cargo/bin/rustup"
        $rustcBin = Join-Path $env:HOME ".cargo/bin/rustc"
        if (Test-Path $rustcBin) {
            # Rust is installed but not in PATH — just add it
            Write-Host "  Found Rust at ~/.cargo/bin — adding to PATH..." -ForegroundColor Gray
            $env:Path = "$env:HOME/.cargo/bin:$env:Path"
            Write-Host "  ✓ Rust found and PATH updated" -ForegroundColor Green
            return
        }
        if (Test-Path $rustupBin) {
            # rustup exists — just run default stable
            Write-Host "  Found rustup — setting up stable toolchain..." -ForegroundColor Gray
            $env:Path = "$env:HOME/.cargo/bin:$env:Path"
            bash -c "$env:HOME/.cargo/bin/rustup default stable" 2>&1 | Out-Host
            Write-Host "  ✓ Rust toolchain configured" -ForegroundColor Green
            return
        }
        # Fresh install — use --no-modify-path to avoid permission errors with shell profiles
        Write-Host "  → Installing via rustup (fresh install)..." -ForegroundColor Gray
        bash -c 'curl --proto "=https" --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --no-modify-path'
        if ($LASTEXITCODE -ne 0) {
            Write-Host "  WARNING: rustup install had errors — checking if Rust is usable..." -ForegroundColor Yellow
        }
        $env:Path = "$env:HOME/.cargo/bin:$env:Path"
        # Verify
        if (Test-Path $rustcBin) {
            Write-Host "  ✓ Rust installed via rustup" -ForegroundColor Green
            Write-Host "  ℹ Add to your shell profile: export PATH=`"$env:HOME/.cargo/bin:`$PATH`"" -ForegroundColor Gray
        } else {
            Write-Host "ERROR: Rust install failed. Try manually:" -ForegroundColor Red
            Write-Host "  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh" -ForegroundColor Red
            exit 1
        }
    } elseif (Test-Command "winget") {
        winget install Rustlang.Rustup --accept-package-agreements --accept-source-agreements
        if ($LASTEXITCODE -ne 0) { throw "winget install failed" }
        Refresh-Path
        rustup default stable 2>&1 | Out-Host
        Write-Host "  ✓ Rust installed via winget" -ForegroundColor Green
    } else {
        Write-Host "ERROR: Cannot auto-install Rust. Install manually: https://rustup.rs/" -ForegroundColor Red
        exit 1
    }
}

function Install-TauriCli {
    Write-Host "  Installing Tauri CLI..." -ForegroundColor Yellow
    npm install -D @tauri-apps/cli
    Write-Host "  ✓ Tauri CLI installed" -ForegroundColor Green
}

function Install-XcodeCommandLineTools {
    if (-not $IsMacOS) { return }
    Write-Host "  Checking Xcode Command Line Tools..." -ForegroundColor Gray
    $xcodeCheck = bash -c 'xcode-select -p 2>/dev/null'
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  Xcode CLT not found. Installing..." -ForegroundColor Yellow
        bash -c 'xcode-select --install'
        Write-Host "  ⚠ Xcode CLT installer launched — complete the dialog, then re-run." -ForegroundColor Yellow
        Write-Host "    After install finishes, run: .\run.ps1 -i" -ForegroundColor Yellow
        exit 0
    } else {
        Write-Host "  ✓ Xcode Command Line Tools: $xcodeCheck" -ForegroundColor Green
    }
}

function Install-LinuxDependencies {
    if (-not $IsLinux) { return }
    Write-Host "  Installing Linux system libraries for Tauri..." -ForegroundColor Yellow
    bash -c 'sudo apt update && sudo apt install -y libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf'
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  WARNING: Some system libraries failed to install." -ForegroundColor Yellow
    } else {
        Write-Host "  ✓ Linux system libraries installed" -ForegroundColor Green
    }
}

# ============================================================================
# HELP
# ============================================================================
if ($help) {
    Write-Host ""
    Write-Host "$ProjectName - Build & Run Script" -ForegroundColor Cyan
    Write-Host ("=" * ($ProjectName.Length + 22)) -ForegroundColor Cyan
    Write-Host ""
    Write-Host "USAGE:" -ForegroundColor Yellow
    Write-Host "  .\run.ps1 [flags]"
    Write-Host ""
    Write-Host "FLAGS:" -ForegroundColor Yellow
    Write-Host "  -h   Show this help message"
    Write-Host "  -i   Install/update all dependencies"
    Write-Host "  -b   Build only (production), don't start dev server"
    Write-Host "  -s   Skip build, just start dev server"
    Write-Host "  -f   Force clean (remove node_modules, dist, caches)"
    Write-Host "  -r   Clean reinstall + build (-f + -i)"
    Write-Host "  -p   Skip git pull"
    Write-Host "  -t   Build Tauri desktop app"
    Write-Host "  -td  Run Tauri dev mode (hot-reload)"
    Write-Host "  -v   Verbose debug output"
    Write-Host ""
    Write-Host "EXAMPLES:" -ForegroundColor Yellow
    Write-Host "  .\run.ps1 -i           # Install all dependencies"
    Write-Host "  .\run.ps1              # Build + start dev server"
    Write-Host "  .\run.ps1 -b           # Production build only"
    Write-Host "  .\run.ps1 -r           # Clean reinstall + build"
    Write-Host "  .\run.ps1 -f           # Force clean rebuild"
    Write-Host "  .\run.ps1 -t           # Build Tauri desktop app"
    Write-Host "  .\run.ps1 -td          # Tauri dev mode"
    Write-Host ""
    Write-Host "CONFIGURATION:" -ForegroundColor Yellow
    Write-Host "  Config: $ConfigPath"
    Write-Host "  Project: $ProjectName"
    Write-Host "  Frontend: $FrontendDir"
    Write-Host ""
    exit 0
}

# ============================================================================
# BANNER
# ============================================================================
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  $ProjectName - Build & Run" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if ($verbose) {
    Write-Host "Configuration:" -ForegroundColor Gray
    Write-Host "  Script Dir: $ScriptDir" -ForegroundColor Gray
    Write-Host "  Frontend Dir: $FrontendDir" -ForegroundColor Gray
    if ($tauri) { Write-Host "  Mode: Tauri Desktop Build" -ForegroundColor Gray }
    if ($tauridev) { Write-Host "  Mode: Tauri Dev" -ForegroundColor Gray }
    Write-Host ""
}

# ============================================================================
# STEP 1: GIT PULL
# ============================================================================
$stepWatch = [System.Diagnostics.Stopwatch]::StartNew()
if (-not $skippull) {
    Write-Host "[1/5] Pulling latest changes..." -ForegroundColor Yellow
    Push-Location $RootDir
    try {
        if (Test-Path ".git") {
            git pull 2>&1 | Out-Host
            if ($LASTEXITCODE -ne 0) {
                Write-Host "  WARNING: git pull failed, continuing..." -ForegroundColor Yellow
            } else {
                Write-Host "  ✓ Git pull complete" -ForegroundColor Green
            }
        } else {
            Write-Host "  Skipping (not a git repository)" -ForegroundColor Gray
        }
    }
    finally { Pop-Location }
} else {
    Write-Host "[1/5] Skipping git pull (-p)" -ForegroundColor Gray
}
$stepWatch.Stop()
Write-Host "  ⏱ $(Format-ElapsedTime $stepWatch)" -ForegroundColor DarkGray
Write-Host ""

# ============================================================================
# STEP 2: PREREQUISITES
# ============================================================================
$stepWatch = [System.Diagnostics.Stopwatch]::StartNew()
Write-Host "[2/5] Checking prerequisites..." -ForegroundColor Yellow

if ($CheckNode) {
    if (-not (Test-Command "node")) { Install-NodeJS }
    $nodeVersion = node --version 2>&1
    Write-Host "  ✓ Node.js: $nodeVersion" -ForegroundColor Green
    $npmVersion = npm --version 2>&1
    Write-Host "  ✓ npm: $npmVersion" -ForegroundColor Green
}

if ($CheckRust) {
    # Add cargo bin to PATH for macOS/Linux where rustc might not be in default PATH
    if (($IsMacOS -or $IsLinux) -and (Test-Path "$env:HOME/.cargo/bin")) {
        $env:Path = "$env:HOME/.cargo/bin:$env:Path"
    }
    if (-not (Test-Command "rustc")) { Install-Rust }
    $rustVersion = rustc --version 2>&1
    Write-Host "  ✓ Rust: $rustVersion" -ForegroundColor Green
}

if ($CheckTauri) {
    $tauriFound = $false
    try {
        $tauriVer = npx tauri --version 2>&1
        if ($LASTEXITCODE -eq 0) { $tauriFound = $true }
    } catch {}
    if (-not $tauriFound) {
        Install-TauriCli
        $tauriVer = "(just installed)"
    }
    Write-Host "  ✓ Tauri CLI: $tauriVer" -ForegroundColor Green
}

$stepWatch.Stop()
Write-Host "  ⏱ $(Format-ElapsedTime $stepWatch)" -ForegroundColor DarkGray
Write-Host ""

# ============================================================================
# INSTALL MODE (-i): Full dev environment setup
# ============================================================================
if ($install) {
    $stepWatch = [System.Diagnostics.Stopwatch]::StartNew()
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  ⏰ $ProjectName — Dev Setup" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""

    if ($rebuild) {
        Write-Host "  Rebuild mode: deferring npm install until after force-clean..." -ForegroundColor Yellow
    } else {
        # 1. macOS: Xcode Command Line Tools
        Install-XcodeCommandLineTools

        # 2. Linux: system libraries
        Install-LinuxDependencies

        # 3. Check/install Rust
        Write-Host ""
        Write-Host "  Checking Rust..." -ForegroundColor Gray
        if (-not (Test-Command "rustc")) {
            Install-Rust
        } else {
            $rustVer = rustc --version 2>&1
            Write-Host "  ✓ Rust: $rustVer" -ForegroundColor Green
            # Update Rust toolchain
            Write-Host "  Updating Rust toolchain..." -ForegroundColor Gray
            rustup update stable 2>&1 | Out-Host
        }

        # 4. Check/install Node.js
        Write-Host ""
        Write-Host "  Checking Node.js..." -ForegroundColor Gray
        if (-not (Test-Command "node")) {
            Install-NodeJS
        } else {
            $nodeVer = node --version 2>&1
            Write-Host "  ✓ Node.js: $nodeVer" -ForegroundColor Green
        }

        # 5. Install npm dependencies
        Write-Host ""
        Write-Host "  Installing npm dependencies..." -ForegroundColor Gray
        Push-Location $FrontendDir
        try {
            Invoke-Expression $InstallCommand
            if ($LASTEXITCODE -ne 0) { throw "npm install failed" }
            Write-Host "  ✓ npm dependencies installed" -ForegroundColor Green
        }
        finally { Pop-Location }

        # 6. Check/install Tauri CLI
        Write-Host ""
        Write-Host "  Checking Tauri CLI..." -ForegroundColor Gray
        $tauriFound = $false
        try {
            $tauriVer = npx tauri --version 2>&1
            if ($LASTEXITCODE -eq 0) { $tauriFound = $true }
        } catch {}
        if (-not $tauriFound) {
            Install-TauriCli
        } else {
            Write-Host "  ✓ Tauri CLI: $tauriVer" -ForegroundColor Green
        }

        # 7. Generate Tauri signing keys (if not already present)
        Write-Host ""
        Write-Host "  Checking Tauri signing keys..." -ForegroundColor Gray
        $TauriKeyDir = Join-Path $env:USERPROFILE ".tauri"
        if (-not $IsMacOS -and -not $IsLinux) {
            $TauriKeyDir = Join-Path $env:USERPROFILE ".tauri"
        } else {
            $TauriKeyDir = Join-Path $env:HOME ".tauri"
        }
        $TauriKeyFile = Join-Path $TauriKeyDir "alarm-app.key"
        $TauriPubKeyFile = "$TauriKeyFile.pub"

        if (Test-Path $TauriKeyFile) {
            Write-Host "  ✓ Signing key already exists: $TauriKeyFile" -ForegroundColor Green
        } else {
            Write-Host "  Generating Tauri signing key pair..." -ForegroundColor Yellow
            if (-not (Test-Path $TauriKeyDir)) {
                New-Item -ItemType Directory -Path $TauriKeyDir -Force | Out-Null
            }
            # Generate key — user will be prompted for password
            Write-Host "  → You will be prompted for a key password (remember it for CI!)" -ForegroundColor Cyan
            npx tauri signer generate -w $TauriKeyFile 2>&1 | Out-Host
            if (Test-Path $TauriKeyFile) {
                Write-Host "  ✓ Signing key generated: $TauriKeyFile" -ForegroundColor Green
                Write-Host "  ✓ Public key: $TauriPubKeyFile" -ForegroundColor Green

                # Read public key and update tauri.conf.json
                $pubKey = Get-Content $TauriPubKeyFile -Raw
                $pubKey = $pubKey.Trim()
                $tauriConfPath = Join-Path $ScriptDir "src-tauri" "tauri.conf.json"
                if (Test-Path $tauriConfPath) {
                    $tauriConf = Get-Content $tauriConfPath -Raw
                    if ($tauriConf -match "REPLACE_WITH_YOUR_PUBLIC_KEY") {
                        $tauriConf = $tauriConf -replace "REPLACE_WITH_YOUR_PUBLIC_KEY", $pubKey
                        Set-Content $tauriConfPath $tauriConf -NoNewline
                        Write-Host "  ✓ Public key auto-inserted into tauri.conf.json" -ForegroundColor Green
                    } else {
                        Write-Host "  ℹ tauri.conf.json already has a public key — skipping" -ForegroundColor Gray
                    }
                }
            } else {
                Write-Host "  ⚠ Key generation failed — you can retry manually:" -ForegroundColor Yellow
                Write-Host "    npx tauri signer generate -w $TauriKeyFile" -ForegroundColor Yellow
            }
        }

        # 8. Print GitHub secrets setup guide
        Write-Host ""
        Write-Host "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Magenta
        Write-Host "  📋 GitHub Secrets Setup (one-time)" -ForegroundColor Magenta
        Write-Host "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Magenta
        Write-Host ""
        Write-Host "  Go to: GitHub → Settings → Secrets → Actions" -ForegroundColor White
        Write-Host "  Add these secrets:" -ForegroundColor White
        Write-Host ""
        Write-Host "  Required:" -ForegroundColor Yellow
        Write-Host "    TAURI_SIGNING_PRIVATE_KEY       → contents of $TauriKeyFile" -ForegroundColor White
        Write-Host "    TAURI_SIGNING_PRIVATE_KEY_PASSWORD → password you entered above" -ForegroundColor White
        Write-Host ""
        Write-Host "  macOS code signing (optional):" -ForegroundColor Yellow
        Write-Host "    APPLE_CERTIFICATE               → base64 .p12 cert" -ForegroundColor White
        Write-Host "    APPLE_CERTIFICATE_PASSWORD       → cert password" -ForegroundColor White
        Write-Host "    APPLE_SIGNING_IDENTITY           → Developer ID Application: ..." -ForegroundColor White
        Write-Host "    APPLE_ID                         → your Apple ID email" -ForegroundColor White
        Write-Host "    APPLE_PASSWORD                   → app-specific password" -ForegroundColor White
        Write-Host "    APPLE_TEAM_ID                    → 10-char team ID" -ForegroundColor White
        Write-Host ""
        Write-Host "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Magenta

        # 9. Summary
        $stepWatch.Stop()
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host "  ✅ Dev environment ready!" -ForegroundColor Green
        Write-Host "  Time: $(Format-ElapsedTime $stepWatch)" -ForegroundColor Cyan
        Write-Host "" -ForegroundColor Cyan
        Write-Host "  Next steps:" -ForegroundColor Cyan
        Write-Host "    .\run.ps1        Build + start dev server" -ForegroundColor White
        Write-Host "    .\run.ps1 -td    Tauri dev mode (hot-reload)" -ForegroundColor White
        Write-Host "    .\run.ps1 -t     Build Tauri desktop app" -ForegroundColor White
        Write-Host "========================================" -ForegroundColor Cyan
        exit 0
    }
}

# ============================================================================
# TAURI DEV MODE (-td)
# ============================================================================
if ($tauridev) {
    Write-Host "[3/5] Starting Tauri dev mode..." -ForegroundColor Yellow

    Push-Location $FrontendDir
    try {
        if (-not (Test-Path "node_modules")) {
            Write-Host "  Installing dependencies first..." -ForegroundColor Gray
            Invoke-Expression $InstallCommand
        }

        Write-Host ""
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host "  $ProjectName — Tauri Dev Mode" -ForegroundColor Cyan
        Write-Host "  Press Ctrl+C to stop" -ForegroundColor Cyan
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host ""

        Invoke-Expression $TauriDevCommand
    }
    finally { Pop-Location }
    exit 0
}

# ============================================================================
# STEP 3: BUILD
# ============================================================================
$stepWatch = [System.Diagnostics.Stopwatch]::StartNew()
if (-not $skipbuild) {
    if ($tauri) {
        Write-Host "[3/5] Building Tauri desktop app..." -ForegroundColor Yellow
    } else {
        Write-Host "[3/5] Building frontend..." -ForegroundColor Yellow
    }

    Push-Location $FrontendDir
    try {
        # Force clean
        if ($force) {
            Write-Host "  FORCE MODE: Cleaning..." -ForegroundColor Magenta
            foreach ($cleanPath in $CleanPaths) {
                $resolved = Resolve-RelativePath $cleanPath
                if (Test-Path $resolved) {
                    Write-Host "  Removing: $cleanPath..." -ForegroundColor Gray
                    Remove-Item -Recurse -Force $resolved -ErrorAction SilentlyContinue
                }
            }
            Write-Host "  ✓ Clean complete" -ForegroundColor Magenta
        }

        # Auto-install if node_modules missing
        if (-not (Test-Path "node_modules") -or $force) {
            Write-Host "  Installing dependencies..." -ForegroundColor Gray
            Invoke-Expression $InstallCommand
            if ($LASTEXITCODE -ne 0) { throw "npm install failed" }
        }

        # Check required modules
        foreach ($m in $RequiredModules) {
            if (-not (Test-Path (Join-Path "node_modules" $m))) {
                Write-Host "  Missing module: $m — running install..." -ForegroundColor Yellow
                Invoke-Expression $InstallCommand
                break
            }
        }

        # Build
        if ($tauri) {
            Write-Host "  Running: $TauriBuildCommand" -ForegroundColor Gray
            Invoke-Expression $TauriBuildCommand
            if ($LASTEXITCODE -ne 0) { throw "Tauri build failed" }
            Write-Host "  ✓ Tauri desktop app built" -ForegroundColor Green
        } else {
            Write-Host "  Running: $BuildCommand" -ForegroundColor Gray
            Invoke-Expression $BuildCommand
            if ($LASTEXITCODE -ne 0) { throw "Build failed" }
            Write-Host "  ✓ Frontend built successfully" -ForegroundColor Green

            if ($PostBuildCommand) {
                Write-Host "  Running post-build: $PostBuildCommand" -ForegroundColor Gray
                Invoke-Expression $PostBuildCommand
            }
        }
    }
    finally { Pop-Location }

    $stepWatch.Stop()
    Write-Host "  ⏱ $(Format-ElapsedTime $stepWatch)" -ForegroundColor DarkGray
    Write-Host ""
} else {
    Write-Host "[3/5] Skipping build (-s)" -ForegroundColor Gray
    Write-Host ""
}

# BUILD ONLY EXIT
if ($buildonly) {
    $TotalStopwatch.Stop()
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  Build complete! (-b mode)" -ForegroundColor Cyan
    Write-Host "  Output: $FrontendDir\$DistDir" -ForegroundColor Cyan
    Write-Host "  Total time: $(Format-ElapsedTime $TotalStopwatch)" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    exit 0
}

# Tauri build exits here
if ($tauri) {
    $TotalStopwatch.Stop()
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  Tauri build complete!" -ForegroundColor Cyan
    Write-Host "  Total time: $(Format-ElapsedTime $TotalStopwatch)" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    exit 0
}

# ============================================================================
# STEP 4: SETUP CONFIG
# ============================================================================
Push-Location $FrontendDir
try {
    $envFile = Join-Path $FrontendDir $ConfigFile
    $envExample = Join-Path $FrontendDir $ConfigExampleFile
    if (-not (Test-Path $envFile)) {
        if (Test-Path $envExample) {
            Write-Host "[4/5] Creating $ConfigFile from $ConfigExampleFile..." -ForegroundColor Yellow
            Copy-Item $envExample $envFile
            Write-Host "  ✓ $ConfigFile created" -ForegroundColor Green
        }
    }
}
finally { Pop-Location }

# ============================================================================
# STEP 5: START DEV SERVER
# ============================================================================
$TotalStopwatch.Stop()
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  $ProjectName starting..." -ForegroundColor Cyan
Write-Host "  Open: http://localhost:$($Ports[0])" -ForegroundColor Cyan
Write-Host "  Press Ctrl+C to stop" -ForegroundColor Cyan
Write-Host "  Setup time: $(Format-ElapsedTime $TotalStopwatch)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Push-Location $FrontendDir
try {
    Invoke-Expression $RunCommand
}
finally { Pop-Location }
