#!/usr/bin/env bash
# ============================================================================
# Alarm App — Build & Run Script (macOS/Linux)
# Version: 1.0.0
# Frontend-only React/Vite project — no Go backend
# Configure via powershell.json
#
# USAGE:
#   ./run.sh -h    Show help
#   ./run.sh -i    Install all dependencies
#   ./run.sh       Build and start dev server
#   ./run.sh -b    Build only (production)
#   ./run.sh -f    Force clean rebuild
#   ./run.sh -r    Clean reinstall + build (-f + -i)
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
#   -d   Run Tauri dev mode
#   -v   Verbose output
# ============================================================================

set -euo pipefail

# ============================================================================
# FLAGS
# ============================================================================
FLAG_BUILDONLY=false
FLAG_SKIPBUILD=false
FLAG_SKIPPULL=false
FLAG_FORCE=false
FLAG_INSTALL=false
FLAG_REBUILD=false
FLAG_HELP=false
FLAG_VERBOSE=false
FLAG_TAURI=false
FLAG_TAURIDEV=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help)      FLAG_HELP=true; shift ;;
    -b|--buildonly)  FLAG_BUILDONLY=true; shift ;;
    -s|--skipbuild)  FLAG_SKIPBUILD=true; shift ;;
    -p|--skippull)   FLAG_SKIPPULL=true; shift ;;
    -f|--force)      FLAG_FORCE=true; shift ;;
    -i|--install)    FLAG_INSTALL=true; shift ;;
    -r|--rebuild)    FLAG_REBUILD=true; shift ;;
    -t|--tauri)      FLAG_TAURI=true; shift ;;
    -d|--dev)        FLAG_TAURIDEV=true; shift ;;
    -v|--verbose)    FLAG_VERBOSE=true; shift ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

if $FLAG_REBUILD; then
  FLAG_FORCE=true
  FLAG_INSTALL=true
fi

# ============================================================================
# COLORS
# ============================================================================
C_RESET="\033[0m"
C_CYAN="\033[36m"
C_GREEN="\033[32m"
C_YELLOW="\033[33m"
C_RED="\033[31m"
C_GRAY="\033[90m"
C_MAGENTA="\033[35m"

print_header()  { echo -e "${C_CYAN}$1${C_RESET}"; }
print_success() { echo -e "  ${C_GREEN}✓ $1${C_RESET}"; }
print_warn()    { echo -e "  ${C_YELLOW}WARNING: $1${C_RESET}"; }
print_error()   { echo -e "  ${C_RED}ERROR: $1${C_RESET}"; }
print_gray()    { echo -e "  ${C_GRAY}$1${C_RESET}"; }
print_step()    { echo -e "${C_YELLOW}$1${C_RESET}"; }

# ============================================================================
# TIMING
# ============================================================================
TOTAL_START=$(date +%s)

format_elapsed() {
  local start=$1
  local end
  end=$(date +%s)
  local diff=$(( end - start ))
  if (( diff >= 60 )); then
    echo "$(( diff / 60 ))m $(( diff % 60 ))s"
  else
    echo "${diff}s"
  fi
}

# ============================================================================
# PATH RESOLUTION
# ============================================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

resolve_path() {
  local p="$1"
  if [[ -z "$p" || "$p" == "." ]]; then echo "$SCRIPT_DIR"
  elif [[ "$p" == /* ]]; then echo "$p"
  else echo "$SCRIPT_DIR/$p"
  fi
}

# ============================================================================
# BOOTSTRAP: Auto-install jq if missing (macOS)
# ============================================================================
if [[ "$(uname)" == "Darwin" ]]; then
  if ! command -v brew &>/dev/null; then
    echo -e "${C_YELLOW}Homebrew not found. Installing...${C_RESET}"
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    if [[ -f "/opt/homebrew/bin/brew" ]]; then
      eval "$(/opt/homebrew/bin/brew shellenv)"
    elif [[ -f "/usr/local/bin/brew" ]]; then
      eval "$(/usr/local/bin/brew shellenv)"
    fi
    print_success "Homebrew installed"
  fi

  if ! command -v jq &>/dev/null; then
    echo -e "${C_YELLOW}jq not found. Installing via brew...${C_RESET}"
    brew install jq
    print_success "jq installed"
  fi
else
  if ! command -v jq &>/dev/null; then
    print_error "jq is required. Install: sudo apt install jq (Debian) or sudo dnf install jq (Fedora)"
    exit 1
  fi
fi

# ============================================================================
# CONFIGURATION LOADING
# ============================================================================
CONFIG_PATH="$SCRIPT_DIR/powershell.json"

if [[ ! -f "$CONFIG_PATH" ]]; then
  print_error "powershell.json not found at: $CONFIG_PATH"
  exit 1
fi

cfg() { jq -r "$1 // \"$2\"" "$CONFIG_PATH"; }
cfg_bool() { jq -r "$1 // $2" "$CONFIG_PATH"; }
cfg_array() { jq -r "$1 // [] | .[]" "$CONFIG_PATH"; }

PROJECT_NAME=$(cfg '.projectName' 'Project')
ROOT_DIR=$(resolve_path "$(cfg '.rootDir' '.')")
FRONTEND_DIR=$(resolve_path "$(cfg '.frontendDir' '.')")
DIST_DIR=$(cfg '.distDir' 'dist')
PORTS=$(jq -r '.ports // [8080] | .[0]' "$CONFIG_PATH")
BUILD_CMD=$(cfg '.buildCommand' 'npm run build')
INSTALL_CMD=$(cfg '.installCommand' 'npm install')
RUN_CMD=$(cfg '.runCommand' 'npm run dev')
CONFIG_FILE=$(cfg '.configFile' '.env')
CONFIG_EXAMPLE=$(cfg '.configExampleFile' '.env.example')
POST_BUILD_CMD=$(cfg '.postBuildCommand' '')
TAURI_BUILD_CMD=$(cfg '.tauriBuildCommand' 'npm run tauri build')
TAURI_DEV_CMD=$(cfg '.tauriDevCommand' 'npm run tauri dev')

CHECK_NODE=$(cfg_bool '.prerequisites.node' 'true')
CHECK_RUST=$(cfg_bool '.prerequisites.rust' 'false')
CHECK_TAURI=$(cfg_bool '.prerequisites.tauri' 'false')

if $FLAG_TAURI || $FLAG_TAURIDEV; then
  CHECK_RUST="true"
  CHECK_TAURI="true"
fi

command_exists() { command -v "$1" &>/dev/null; }

# ============================================================================
# AUTO-INSTALL FUNCTIONS
# ============================================================================
install_node() {
  echo -e "  ${C_YELLOW}Node.js not found. Installing...${C_RESET}"
  if [[ "$(uname)" == "Darwin" ]]; then
    brew install node
  else
    print_error "Auto-install not supported. Install Node.js: https://nodejs.org/"
    exit 1
  fi
  print_success "Node.js installed"
}

install_rust() {
  echo -e "  ${C_YELLOW}Rust not found. Installing via rustup...${C_RESET}"
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --no-modify-path
  source "$HOME/.cargo/env"
  print_success "Rust installed: $(rustc --version)"
}

install_tauri_cli() {
  echo -e "  ${C_YELLOW}Installing Tauri CLI...${C_RESET}"
  pushd "$FRONTEND_DIR" > /dev/null
  npm install -D @tauri-apps/cli
  popd > /dev/null
  print_success "Tauri CLI installed"
}

# ============================================================================
# HELP
# ============================================================================
if $FLAG_HELP; then
  echo ""
  print_header "$PROJECT_NAME - Build & Run Script"
  echo ""
  echo -e "${C_YELLOW}USAGE:${C_RESET}"
  echo "  ./run.sh [flags]"
  echo ""
  echo -e "${C_YELLOW}FLAGS:${C_RESET}"
  echo "  -h   Show this help message"
  echo "  -i   Install/update all dependencies"
  echo "  -b   Build only (production), don't start dev server"
  echo "  -s   Skip build, just start dev server"
  echo "  -f   Force clean (remove node_modules, dist, caches)"
  echo "  -r   Clean reinstall + build (-f + -i)"
  echo "  -p   Skip git pull"
  echo "  -t   Build Tauri desktop app"
  echo "  -d   Run Tauri dev mode (hot-reload)"
  echo "  -v   Verbose debug output"
  echo ""
  echo -e "${C_YELLOW}EXAMPLES:${C_RESET}"
  echo "  ./run.sh -i           # Install all dependencies"
  echo "  ./run.sh              # Build + start dev server"
  echo "  ./run.sh -b           # Production build only"
  echo "  ./run.sh -r           # Clean reinstall + build"
  echo "  ./run.sh -f           # Force clean rebuild"
  echo "  ./run.sh -t           # Build Tauri desktop app"
  echo "  ./run.sh -d           # Tauri dev mode"
  echo ""
  exit 0
fi

# ============================================================================
# BANNER
# ============================================================================
echo ""
print_header "========================================"
print_header "  $PROJECT_NAME - Build & Run"
print_header "========================================"
echo ""

if $FLAG_VERBOSE; then
  print_gray "Script Dir:  $SCRIPT_DIR"
  print_gray "Frontend:    $FRONTEND_DIR"
  $FLAG_TAURI && print_gray "Mode: Tauri Desktop Build"
  $FLAG_TAURIDEV && print_gray "Mode: Tauri Dev"
  echo ""
fi

# ============================================================================
# STEP 1: GIT PULL
# ============================================================================
STEP_START=$(date +%s)
if ! $FLAG_SKIPPULL; then
  print_step "[1/5] Pulling latest changes..."
  pushd "$ROOT_DIR" > /dev/null
  if [[ -d ".git" ]]; then
    if git pull 2>&1; then
      print_success "Git pull complete"
    else
      print_warn "git pull failed, continuing..."
    fi
  else
    print_gray "Skipping (not a git repository)"
  fi
  popd > /dev/null
else
  print_step "[1/5] Skipping git pull (-p)"
fi
print_gray "⏱ $(format_elapsed $STEP_START)"
echo ""

# ============================================================================
# STEP 2: PREREQUISITES
# ============================================================================
STEP_START=$(date +%s)
print_step "[2/5] Checking prerequisites..."

if [[ "$CHECK_NODE" == "true" ]]; then
  if ! command_exists node; then install_node; fi
  print_success "Node.js: $(node --version)"
  print_success "npm: $(npm --version)"
fi

if [[ "$CHECK_RUST" == "true" ]]; then
  if ! command_exists rustc; then install_rust; fi
  print_success "Rust: $(rustc --version)"
fi

if [[ "$CHECK_TAURI" == "true" ]]; then
  if ! npx tauri --version &>/dev/null; then
    install_tauri_cli
  fi
  print_success "Tauri CLI: $(npx tauri --version 2>/dev/null || echo 'installed')"
fi

print_gray "⏱ $(format_elapsed $STEP_START)"
echo ""

# ============================================================================
# INSTALL MODE (-i)
# ============================================================================
if $FLAG_INSTALL; then
  STEP_START=$(date +%s)
  print_header "[INSTALL] Installing dependencies..."
  echo ""

  if $FLAG_REBUILD; then
    echo -e "  ${C_YELLOW}Rebuild mode: deferring until after force-clean...${C_RESET}"
  else
    pushd "$FRONTEND_DIR" > /dev/null
    print_gray "Running: $INSTALL_CMD"
    eval "$INSTALL_CMD"
    print_success "Dependencies installed"
    popd > /dev/null

    # Generate Tauri signing keys if not present
    echo ""
    print_gray "Checking Tauri signing keys..."
    TAURI_KEY_DIR="$HOME/.tauri"
    TAURI_KEY_FILE="$TAURI_KEY_DIR/alarm-app.key"
    TAURI_PUB_FILE="$TAURI_KEY_FILE.pub"

    if [[ -f "$TAURI_KEY_FILE" ]]; then
      print_success "Signing key already exists: $TAURI_KEY_FILE"
    else
      echo -e "  ${C_YELLOW}Generating Tauri signing key pair...${C_RESET}"
      mkdir -p "$TAURI_KEY_DIR"
      echo -e "  ${C_CYAN}→ You will be prompted for a key password (remember it for CI!)${C_RESET}"
      pushd "$FRONTEND_DIR" > /dev/null
      npx tauri signer generate -w "$TAURI_KEY_FILE" 2>&1
      popd > /dev/null
      if [[ -f "$TAURI_KEY_FILE" ]]; then
        print_success "Signing key generated: $TAURI_KEY_FILE"
        print_success "Public key: $TAURI_PUB_FILE"

        # Auto-insert public key into tauri.conf.json
        TAURI_CONF="$SCRIPT_DIR/src-tauri/tauri.conf.json"
        if [[ -f "$TAURI_CONF" ]]; then
          if grep -q "REPLACE_WITH_YOUR_PUBLIC_KEY" "$TAURI_CONF"; then
            PUB_KEY=$(cat "$TAURI_PUB_FILE" | tr -d '\n')
            sed -i.bak "s|REPLACE_WITH_YOUR_PUBLIC_KEY|$PUB_KEY|g" "$TAURI_CONF"
            rm -f "$TAURI_CONF.bak"
            print_success "Public key auto-inserted into tauri.conf.json"
          else
            print_gray "tauri.conf.json already has a public key — skipping"
          fi
        fi
      else
        print_warn "Key generation failed — retry manually:"
        echo "    npx tauri signer generate -w $TAURI_KEY_FILE"
      fi
    fi

    # Print GitHub secrets setup guide
    echo ""
    echo -e "  ${C_MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${C_RESET}"
    echo -e "  ${C_MAGENTA}📋 GitHub Secrets Setup (one-time)${C_RESET}"
    echo -e "  ${C_MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${C_RESET}"
    echo ""
    echo "  Go to: GitHub → Settings → Secrets → Actions"
    echo "  Add these secrets:"
    echo ""
    echo -e "  ${C_YELLOW}Required:${C_RESET}"
    echo "    TAURI_SIGNING_PRIVATE_KEY         → contents of $TAURI_KEY_FILE"
    echo "    TAURI_SIGNING_PRIVATE_KEY_PASSWORD → password you entered above"
    echo ""
    echo -e "  ${C_YELLOW}macOS code signing (optional):${C_RESET}"
    echo "    APPLE_CERTIFICATE                 → base64 .p12 cert"
    echo "    APPLE_CERTIFICATE_PASSWORD         → cert password"
    echo "    APPLE_SIGNING_IDENTITY             → Developer ID Application: ..."
    echo "    APPLE_ID                           → your Apple ID email"
    echo "    APPLE_PASSWORD                     → app-specific password"
    echo "    APPLE_TEAM_ID                      → 10-char team ID"
    echo ""
    echo -e "  ${C_MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${C_RESET}"

    echo ""
    print_header "========================================"
    print_header "  ✅ Dev environment ready!"
    print_header "  Time: $(format_elapsed $STEP_START)"
    print_header ""
    print_header "  Next steps:"
    echo "    ./run.sh        Build + start dev server"
    echo "    ./run.sh -d     Tauri dev mode (hot-reload)"
    echo "    ./run.sh -t     Build Tauri desktop app"
    print_header "========================================"
    exit 0
  fi
fi

# ============================================================================
# TAURI DEV MODE (-d)
# ============================================================================
if $FLAG_TAURIDEV; then
  print_step "[DEV] Setting up Tauri dev mode..."
  pushd "$FRONTEND_DIR" > /dev/null

  # Auto-install Rust if missing
  if ! command_exists rustc; then
    if [[ -f "$HOME/.cargo/bin/rustc" ]]; then
      source "$HOME/.cargo/env"
    else
      install_rust
    fi
  fi
  print_success "Rust: $(rustc --version)"

  # Auto-install dependencies if missing
  if [[ ! -d "node_modules" ]]; then
    print_gray "Installing dependencies..."
    eval "$INSTALL_CMD"
    print_success "Dependencies installed"
  fi

  # Auto-install Tauri CLI if missing
  if ! npx tauri --version &>/dev/null; then
    install_tauri_cli
  fi
  print_success "Tauri CLI: $(npx tauri --version 2>/dev/null || echo 'installed')"

  # macOS: check Xcode CLT
  if [[ "$(uname)" == "Darwin" ]]; then
    if ! xcode-select -p &>/dev/null; then
      print_warn "Xcode Command Line Tools not found — installing..."
      xcode-select --install
      echo -e "  ${C_YELLOW}Complete the Xcode CLT dialog, then re-run ./run.sh -d${C_RESET}"
      popd > /dev/null
      exit 0
    fi
  fi

  # Linux: check system libraries
  if [[ "$(uname)" == "Linux" ]]; then
    if ! dpkg -l libwebkit2gtk-4.1-dev &>/dev/null 2>&1; then
      print_gray "Installing Linux system libraries for Tauri..."
      sudo apt update && sudo apt install -y libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf libasound2-dev
    fi
  fi

  echo ""
  print_header "========================================"
  print_header "  $PROJECT_NAME — Tauri Dev Mode"
  print_header "  Press Ctrl+C to stop"
  print_header "========================================"
  echo ""

  eval "$TAURI_DEV_CMD"
  popd > /dev/null
  exit 0
fi

# ============================================================================
# STEP 3: BUILD
# ============================================================================
STEP_START=$(date +%s)
if ! $FLAG_SKIPBUILD; then
  if $FLAG_TAURI; then
    print_step "[3/5] Building Tauri desktop app..."
  else
    print_step "[3/5] Building frontend..."
  fi

  pushd "$FRONTEND_DIR" > /dev/null

  # Force clean
  if $FLAG_FORCE; then
    echo -e "  ${C_MAGENTA}FORCE MODE: Cleaning...${C_RESET}"
    while IFS= read -r clean_path; do
      [[ -z "$clean_path" ]] && continue
      resolved=$(resolve_path "$clean_path")
      if [[ -e "$resolved" ]]; then
        rm -rf "$resolved"
        print_gray "Removed: $clean_path"
      fi
    done < <(cfg_array '.cleanPaths')
    echo -e "  ${C_MAGENTA}✓ Clean complete${C_RESET}"
  fi

  # Auto-install if node_modules missing
  if [[ ! -d "node_modules" ]] || $FLAG_FORCE; then
    print_gray "Installing dependencies..."
    eval "$INSTALL_CMD"
  fi

  # Check required modules
  while IFS= read -r mod; do
    [[ -z "$mod" ]] && continue
    if [[ ! -d "node_modules/$mod" ]]; then
      print_gray "Missing module: $mod — running install..."
      eval "$INSTALL_CMD"
      break
    fi
  done < <(cfg_array '.requiredModules')

  # Build
  if $FLAG_TAURI; then
    print_gray "Running: $TAURI_BUILD_CMD"
    eval "$TAURI_BUILD_CMD"
    print_success "Tauri desktop app built"
  else
    print_gray "Running: $BUILD_CMD"
    eval "$BUILD_CMD"
    print_success "Frontend built successfully"

    if [[ -n "$POST_BUILD_CMD" ]]; then
      print_gray "Running post-build: $POST_BUILD_CMD"
      eval "$POST_BUILD_CMD"
    fi
  fi

  popd > /dev/null
  print_gray "⏱ $(format_elapsed $STEP_START)"
  echo ""
else
  print_step "[3/5] Skipping build (-s)"
  echo ""
fi

# BUILD ONLY EXIT
if $FLAG_BUILDONLY; then
  TOTAL_END=$(date +%s)
  print_header "========================================"
  print_header "  Build complete! (-b mode)"
  print_header "  Output: $FRONTEND_DIR/$DIST_DIR"
  print_header "  Total time: $(( TOTAL_END - TOTAL_START ))s"
  print_header "========================================"
  exit 0
fi

# Tauri build exits here
if $FLAG_TAURI; then
  TOTAL_END=$(date +%s)
  print_header "========================================"
  print_header "  Tauri build complete!"
  print_header "  Total time: $(( TOTAL_END - TOTAL_START ))s"
  print_header "========================================"
  exit 0
fi

# ============================================================================
# STEP 4: SETUP CONFIG
# ============================================================================
pushd "$FRONTEND_DIR" > /dev/null
ENV_FILE="$FRONTEND_DIR/$CONFIG_FILE"
ENV_EXAMPLE="$FRONTEND_DIR/$CONFIG_EXAMPLE"
if [[ ! -f "$ENV_FILE" && -f "$ENV_EXAMPLE" ]]; then
  print_step "[4/5] Creating $CONFIG_FILE from $CONFIG_EXAMPLE..."
  cp "$ENV_EXAMPLE" "$ENV_FILE"
  print_success "$CONFIG_FILE created"
fi
popd > /dev/null

# ============================================================================
# STEP 5: START DEV SERVER
# ============================================================================
TOTAL_END=$(date +%s)
echo ""
print_header "========================================"
print_header "  $PROJECT_NAME starting..."
print_header "  Open: http://localhost:$PORTS"
print_header "  Press Ctrl+C to stop"
print_header "  Setup time: $(( TOTAL_END - TOTAL_START ))s"
print_header "========================================"
echo ""

pushd "$FRONTEND_DIR" > /dev/null
eval "$RUN_CMD"
popd > /dev/null
