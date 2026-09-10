#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════
#  VanillaAgent Universal Installer
#  Sovereign Autonomous AI Agent Runtime & Swarm Engine
#
#  A self-extracting installer for macOS and Linux.
#
#    ./VanillaAgent-installer.sh                 interactive install
#    ./VanillaAgent-installer.sh --prefix DIR    choose the install location
#    ./VanillaAgent-installer.sh --yes           non-interactive
#    ./VanillaAgent-installer.sh --no-deps       skip the dependency bootstrap
#    ./VanillaAgent-installer.sh --uninstall     remove a previous install
#    ./VanillaAgent-installer.sh --help          this message
# ═══════════════════════════════════════════════════════════════════════════

set -uo pipefail

VA_VERSION="@@VERSION@@"
VA_PAYLOAD_SHA256="@@PAYLOAD_SHA256@@"
VA_MIN_NODE=20

# ─────────────────────────────────────────────────────────────────────────────
# Theme
# ─────────────────────────────────────────────────────────────────────────────
if [ -t 1 ] && [ -z "${NO_COLOR:-}" ] && [ "${TERM:-dumb}" != "dumb" ]; then
  C_RESET=$'\033[0m'; C_BOLD=$'\033[1m'; C_DIM=$'\033[2m'
  C_TEAL=$'\033[38;2;45;212;191m'; C_BRAND=$'\033[38;2;20;184;166m'
  C_WHITE=$'\033[38;2;226;232;240m'; C_SLATE=$'\033[38;2;148;163;184m'
  C_AMBER=$'\033[38;2;251;191;36m'; C_ROSE=$'\033[38;2;251;113;133m'
  C_GREEN=$'\033[38;2;52;211;153m'
else
  C_RESET=""; C_BOLD=""; C_DIM=""; C_TEAL=""; C_BRAND=""; C_WHITE=""
  C_SLATE=""; C_AMBER=""; C_ROSE=""; C_GREEN=""
fi

GLYPH_OK="✓"; GLYPH_BAD="✗"; GLYPH_ARROW="▸"; GLYPH_DOT="◆"

# ─────────────────────────────────────────────────────────────────────────────
# UI helpers
# ─────────────────────────────────────────────────────────────────────────────
banner() {
  printf "\n"
  printf "%s%s ██╗   ██╗ █████╗ ███╗   ██╗██╗██╗     ██╗      █████╗ %s\n" "$C_BOLD" "$C_TEAL" "$C_RESET"
  printf "%s%s ██║   ██║██╔══██╗████╗  ██║██║██║     ██║     ██╔══██╗%s\n" "$C_BOLD" "$C_TEAL" "$C_RESET"
  printf "%s%s ██║   ██║███████║██╔██╗ ██║██║██║     ██║     ███████║%s\n" "$C_BOLD" "$C_TEAL" "$C_RESET"
  printf "%s%s ╚██╗ ██╔╝██╔══██║██║╚██╗██║██║██║     ██║     ██╔══██║%s\n" "$C_BOLD" "$C_TEAL" "$C_RESET"
  printf "%s%s  ╚████╔╝ ██║  ██║██║ ╚████║██║███████╗███████╗██║  ██║%s\n" "$C_BOLD" "$C_TEAL" "$C_RESET"
  printf "%s%s   ╚═══╝  ╚═╝  ╚═╝╚═╝  ╚═══╝╚═╝╚══════╝╚══════╝╚═╝  ╚═╝%s\n" "$C_BOLD" "$C_TEAL" "$C_RESET"
  printf "%s%s        A G E N T   R U N T I M E   ·   v%s%s%s\n" "$C_DIM" "$C_TEAL" "$VA_VERSION" "$C_RESET"
  printf "%s%s   Sovereign Autonomous AI Agent Runtime & Swarm Engine%s\n\n" "$C_DIM" "$C_SLATE" "$C_RESET"
}

rule() {
  printf "  %s%s%s\n" "$C_DIM" "────────────────────────────────────────────────────────────────────" "$C_RESET"
}

step()  { printf "  %s%s%s %s%s%s\n" "$C_BRAND" "$GLYPH_ARROW" "$C_RESET" "$C_WHITE" "$1" "$C_RESET"; }
ok()    { printf "  %s%s%s %s%s%s\n" "$C_GREEN" "$GLYPH_OK" "$C_RESET" "$C_SLATE" "$1" "$C_RESET"; }
warn()  { printf "  %s!%s %s%s%s\n" "$C_AMBER" "$C_RESET" "$C_AMBER" "$1" "$C_RESET"; }
info()  { printf "  %s%s%s %s%s%s\n" "$C_TEAL" "$GLYPH_DOT" "$C_RESET" "$C_SLATE" "$1" "$C_RESET"; }
die()   { printf "\n  %s%s%s %s%s%s\n\n" "$C_ROSE" "$GLYPH_BAD" "$C_RESET" "$C_ROSE" "$1" "$C_RESET"; exit 1; }
kv()    { printf "    %s%-16s%s %s%s%s\n" "$C_SLATE" "$1" "$C_RESET" "$C_WHITE" "$2" "$C_RESET"; }

spinner_start() {
  SPINNER_LABEL="$1"
  SPINNER_PID=""
  [ -t 1 ] || return 0
  [ -n "${NO_COLOR:-}" ] && { printf "  %s%s%s %s%s%s\n" "$C_BRAND" "$GLYPH_ARROW" "$C_RESET" "$C_WHITE" "$SPINNER_LABEL" "$C_RESET"; return 0; }
  (
    frames='⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'
    i=0
    while true; do
      i=$(( (i+1) % 10 ))
      printf "\r  %s%s%s %s%s%s   " "$C_BRAND" "$(printf '%s' "${frames:$i:1}")" "$C_RESET" "$C_WHITE" "$SPINNER_LABEL"
      sleep 0.09
    done
  ) &
  SPINNER_PID=$!
}

spinner_stop() {
  local msg="${1:-$SPINNER_LABEL}"
  if [ -n "$SPINNER_PID" ]; then
    kill "$SPINNER_PID" 2>/dev/null || true
    wait "$SPINNER_PID" 2>/dev/null || true
    SPINNER_PID=""
    printf "\r  %s%s%s %s%s%s   \n" "$C_GREEN" "$GLYPH_OK" "$C_RESET" "$C_SLATE" "$msg" "$C_RESET"
  else
    ok "$msg"
  fi
}

progress() { # progress <current> <total> <label>
  local cur="$1" total="$2" label="$3" width=34
  [ -t 1 ] || { step "$label"; return 0; }
  local filled=$(( cur * width / (total > 0 ? total : 1) ))
  local empty=$(( width - filled ))
  local bar=""
  local i
  for ((i = 0; i < filled; i++)); do bar+="█"; done
  for ((i = 0; i < empty; i++)); do bar+="░"; done
  printf "\r  %s%s%s %s%s%s %s%3d%%%s" "$C_BRAND" "$GLYPH_ARROW" "$C_RESET" "$C_WHITE" "$label" "$C_RESET" "$C_TEAL" "$(( cur * 100 / (total > 0 ? total : 1) ))" "$C_RESET"
  [ "$cur" -ge "$total" ] && printf "\n"
}

ask() { # ask <prompt> <default> -> REPLY
  local prompt="$1" default="$2"
  if [ "${ASSUME_YES:-0}" = "1" ]; then REPLY="$default"; return 0; fi
  printf "  %s%s%s [%s%s%s]: " "$C_WHITE" "$prompt" "$C_RESET" "$C_DIM" "$default" "$C_RESET"
  read -r reply
  REPLY="${reply:-$default}"
}

confirm() { # confirm <prompt> <default y/n>
  local prompt="$1" default="${2:-y}"
  if [ "${ASSUME_YES:-0}" = "1" ]; then return 0; fi
  local hint="y/N"
  [ "$default" = "y" ] && hint="Y/n"
  printf "  %s%s%s [%s%s%s]: " "$C_WHITE" "$prompt" "$C_RESET" "$C_DIM" "$hint" "$C_RESET"
  read -r reply
  reply="${reply:-$default}"
  case "$reply" in y|Y|yes|YES) return 0 ;; *) return 1 ;; esac
}

# ─────────────────────────────────────────────────────────────────────────────
# Arguments
# ─────────────────────────────────────────────────────────────────────────────
ASSUME_YES=0
DO_DEPS=1
DO_LINKS=1
DO_DESKTOP=1
DO_LAUNCH=0
PREFIX=""
UNINSTALL=0

while [ $# -gt 0 ]; do
  case "$1" in
    --help|-h)
      sed -n '2,20p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    --prefix) PREFIX="$2"; shift 2 ;;
    --yes|-y) ASSUME_YES=1; shift ;;
    --no-deps) DO_DEPS=0; shift ;;
    --no-links) DO_LINKS=0; shift ;;
    --no-desktop) DO_DESKTOP=0; shift ;;
    --launch) DO_LAUNCH=1; shift ;;
    --uninstall) UNINSTALL=1; shift ;;
    *) die "Unknown option: $1 (try --help)" ;;
  esac
done

# ─────────────────────────────────────────────────────────────────────────────
# Environment detection
# ─────────────────────────────────────────────────────────────────────────────
OS="$(uname -s)"
ARCH="$(uname -m)"
case "$OS" in
  Darwin) OS_LABEL="macOS" ;;
  Linux)  OS_LABEL="Linux" ;;
  *)      OS_LABEL="$OS" ;;
esac
case "$ARCH" in
  arm64|aarch64) ARCH_LABEL="arm64" ;;
  x86_64|amd64)  ARCH_LABEL="x86_64" ;;
  *)             ARCH_LABEL="$ARCH" ;;
esac

# ─────────────────────────────────────────────────────────────────────────────
# Uninstall mode
# ─────────────────────────────────────────────────────────────────────────────
if [ "$UNINSTALL" = "1" ]; then
  banner
  for dir in "/opt/vanilla-agent" "${HOME}/.local/share/vanilla-agent"; do
    if [ -x "$dir/lib/uninstall.sh" ]; then
      info "Found an install at $dir"
      exec "$dir/lib/uninstall.sh" "$@"
    fi
  done
  die "No VanillaAgent installation found."
fi

# ─────────────────────────────────────────────────────────────────────────────
# Preflight
# ─────────────────────────────────────────────────────────────────────────────
banner

detect_node() {
  NODE_BIN="$(command -v node || true)"
  NODE_VERSION=""
  if [ -z "$NODE_BIN" ]; then
    for candidate in /usr/local/bin/node /opt/homebrew/bin/node /usr/bin/node; do
      [ -x "$candidate" ] && NODE_BIN="$candidate" && break
    done
  fi
  [ -n "$NODE_BIN" ] && NODE_VERSION="$("$NODE_BIN" --version 2>/dev/null || true)"
}

node_major() {
  printf '%s' "${1#v}" | cut -d. -f1
}

printf "  %sPreflight%s\n" "$C_BOLD$C_WHITE" "$C_RESET"
detect_node
kv "Platform" "${OS_LABEL} ${ARCH_LABEL}"
if [ -n "$NODE_VERSION" ]; then
  kv "Node.js" "${NODE_VERSION} at ${NODE_BIN}"
else
  kv "Node.js" "not found"
fi
printf "\n"

# Default install prefix
if [ -z "$PREFIX" ]; then
  if [ "$OS" = "Darwin" ]; then
    PREFIX="/Applications/VanillaAgent"
    [ -w /Applications ] || PREFIX="${HOME}/Applications/VanillaAgent"
  else
    if [ "$(id -u)" = "0" ] || [ -w /opt ]; then
      PREFIX="/opt/vanilla-agent"
    else
      PREFIX="${HOME}/.local/share/vanilla-agent"
    fi
  fi
fi

if [ -d "$PREFIX" ]; then
  warn "An installation already exists at ${PREFIX}"
  if ! confirm "Replace it with VanillaAgent ${VA_VERSION}?" "y"; then
    info "Keeping the existing installation. Nothing changed."
    exit 0
  fi
  rm -rf "$PREFIX" 2>/dev/null || die "Could not remove ${PREFIX} (try again with sudo)."
fi

printf "  %sInstallation%s\n" "$C_BOLD$C_WHITE" "$C_RESET"
ask "Install location" "$PREFIX"
PREFIX="$REPLY"
kv "Target" "$PREFIX"

printf "\n"
if [ "$DO_LINKS" = "1" ]; then
  DO_LINKS=0
  if [ "$OS" = "Darwin" ] || [ -w /usr/local/bin ] || [ "$(id -u)" = "0" ]; then
    if confirm "Link vanilla, vanilla-gui and vanilla-cli into /usr/local/bin?" "y"; then DO_LINKS=1; fi
  fi
fi

if [ "$OS" = "Linux" ] && [ "$DO_DESKTOP" = "1" ]; then
  if ! confirm "Add a desktop entry and application icon?" "y"; then DO_DESKTOP=0; fi
fi

if [ -z "$NODE_VERSION" ]; then
  printf "\n"
  warn "Node.js ${VA_MIN_NODE}+ was not found."
  info "Install it from https://nodejs.org — VanillaAgent cannot run without it."
  info "The installer will still copy the runtime so you can finish later."
  DO_DEPS=0
elif [ "$(node_major "$NODE_VERSION")" -lt "$VA_MIN_NODE" ] 2>/dev/null; then
  printf "\n"
  warn "Node.js ${NODE_VERSION} is older than the required v${VA_MIN_NODE}."
  info "Upgrade from https://nodejs.org for the best experience."
fi

if [ "$DO_DEPS" = "1" ] && [ "${ASSUME_YES:-0}" != "1" ]; then
  printf "\n"
  if ! confirm "Install runtime dependencies now (needs an internet connection)?" "y"; then
    DO_DEPS=0
  fi
fi

# ─────────────────────────────────────────────────────────────────────────────
# Extract
# ─────────────────────────────────────────────────────────────────────────────
TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/vanilla-agent.XXXXXX")"
cleanup() { rm -rf "$TMP_DIR" 2>/dev/null || true; }
trap cleanup EXIT INT TERM

printf "\n  %sInstalling%s\n" "$C_BOLD$C_WHITE" "$C_RESET"

PAYLOAD_LINE="$(awk '/^__VA_PAYLOAD_BELOW__$/ { print NR + 1; exit 0; }' "$0")"
[ -n "$PAYLOAD_LINE" ] || die "This installer is corrupt (payload marker missing)."

spinner_start "Verifying the installer payload"
tail -n +"$PAYLOAD_LINE" "$0" > "${TMP_DIR}/payload.tar.gz"
if command -v sha256sum >/dev/null 2>&1; then
  SUM="$(sha256sum "${TMP_DIR}/payload.tar.gz" | awk '{print $1}')"
elif command -v shasum >/dev/null 2>&1; then
  SUM="$(shasum -a 256 "${TMP_DIR}/payload.tar.gz" | awk '{print $1}')"
else
  SUM=""
fi
if [ -n "$SUM" ] && [ -n "$VA_PAYLOAD_SHA256" ] && [ "$SUM" != "$VA_PAYLOAD_SHA256" ]; then
  printf "\n"
  die "Checksum mismatch — this download is damaged. Please download VanillaAgent again."
fi
spinner_stop "Payload verified"

spinner_start "Unpacking the runtime"
mkdir -p "${TMP_DIR}/src"
tar -xzf "${TMP_DIR}/payload.tar.gz" -C "${TMP_DIR}/src" 2>/dev/null \
  || die "Could not unpack the payload."
spinner_stop "Runtime unpacked"

spinner_start "Copying files to ${PREFIX}"
mkdir -p "$PREFIX" || die "Could not create ${PREFIX} (try again with sudo)."
if command -v cp >/dev/null 2>&1; then
  (cd "${TMP_DIR}/src" && cp -R . "$PREFIX/") || die "Could not copy files into ${PREFIX}."
fi
chmod 755 "$PREFIX/vanilla" "$PREFIX/vanilla-gui" "$PREFIX/vanilla-cli" 2>/dev/null || true
chmod 755 "$PREFIX/lib/uninstall.sh" 2>/dev/null || true
spinner_stop "Files installed"

# ─────────────────────────────────────────────────────────────────────────────
# Integration
# ─────────────────────────────────────────────────────────────────────────────
STEPS=4
[ "$DO_DEPS" = "1" ] && STEPS=5
DONE=0

if [ "$DO_LINKS" = "1" ]; then
  progress $((++DONE)) "$STEPS" "Linking command line launchers"
  mkdir -p /usr/local/bin 2>/dev/null || true
  for cmd in vanilla vanilla-gui vanilla-cli; do
    if [ -w /usr/local/bin ] || [ "$(id -u)" = "0" ]; then
      ln -sf "${PREFIX}/${cmd}" "/usr/local/bin/${cmd}" 2>/dev/null || true
    fi
  done
else
  progress $((++DONE)) "$STEPS" "Skipping command line links"
fi

if [ "$OS" = "Linux" ] && [ "$DO_DESKTOP" = "1" ]; then
  progress $((++DONE)) "$STEPS" "Adding desktop entry and icon"
  APPS_DIR="${XDG_DATA_HOME:-$HOME/.local/share}/applications"
  ICON_DIR="${XDG_DATA_HOME:-$HOME/.local/share}/icons/hicolor/512x512/apps"
  mkdir -p "$APPS_DIR" "$ICON_DIR" 2>/dev/null || true
  if [ -f "${PREFIX}/tools/vanilla-agent.desktop" ]; then
    sed "s|Exec=vanilla-gui|Exec=${PREFIX}/vanilla-gui|" "${PREFIX}/tools/vanilla-agent.desktop" > "${APPS_DIR}/vanilla-agent.desktop" 2>/dev/null || true
  fi
  [ -f "${PREFIX}/assets/logo-512.png" ] && cp -f "${PREFIX}/assets/logo-512.png" "${ICON_DIR}/vanillaagent.png" 2>/dev/null || true
  SERVICES_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user"
  if command -v systemctl >/dev/null 2>&1 && [ -f "${PREFIX}/tools/vanilla-agent.service" ]; then
    mkdir -p "$SERVICES_DIR" 2>/dev/null || true
    sed "s|@@EXEC_START@@|${PREFIX}/vanilla --run|" "${PREFIX}/tools/vanilla-agent.service" > "${SERVICES_DIR}/vanilla-agent.service" 2>/dev/null || true
    systemctl --user daemon-reload >/dev/null 2>&1 || true
  fi
  command -v update-desktop-database >/dev/null 2>&1 && update-desktop-database "$APPS_DIR" >/dev/null 2>&1 || true
else
  progress $((++DONE)) "$STEPS" "Skipping desktop integration"
fi

progress $((++DONE)) "$STEPS" "Writing install manifest"
cat > "${PREFIX}/install-manifest.json" <<EOF
{
  "name": "VanillaAgent",
  "version": "${VA_VERSION}",
  "installId": "com.vanillaagent.runtime",
  "installedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "installer": "universal-shell",
  "prefix": "${PREFIX}",
  "platform": "${OS_LABEL} ${ARCH_LABEL}"
}
EOF
progress $((++DONE)) "$STEPS" "Manifest written"

DEPS_RESULT="skipped"
if [ "$DO_DEPS" = "1" ] && [ -n "$NODE_BIN" ]; then
  progress $((++DONE)) "$STEPS" "Resolving runtime dependencies"
  printf "\r  %s%s%s %s%s%s" "$C_BRAND" "$GLYPH_ARROW" "$C_RESET" "$C_WHITE" "Installing dependencies (npm install)" "$C_RESET"
  if (cd "$PREFIX" && "$NODE_BIN" "$PREFIX/lib/bootstrap.mjs" deps) ; then
    printf "\r  %s%s%s %s%s%s   \n" "$C_GREEN" "$GLYPH_OK" "$C_RESET" "$C_SLATE" "Runtime dependencies installed" "$C_RESET"
    DEPS_RESULT="installed"
  else
    printf "\r  %s!%s %s%s%s   \n" "$C_AMBER" "$C_RESET" "$C_AMBER" "Dependency install failed — run it later from ${PREFIX}" "$C_RESET"
    DEPS_RESULT="failed"
  fi
elif [ "$DO_DEPS" = "1" ]; then
  progress $((++DONE)) "$STEPS" "Skipping dependencies (no Node.js)"
  DEPS_RESULT="no-node"
fi

# ─────────────────────────────────────────────────────────────────────────────
# Summary
# ─────────────────────────────────────────────────────────────────────────────
printf "\n"
printf "  %s%s%s%s%s\n" "$C_BOLD" "$C_TEAL" "$GLYPH_DOT" "  VanillaAgent ${VA_VERSION} is installed" "$C_RESET"
rule
kv "Location" "$PREFIX"
kv "Launch GUI" "${PREFIX}/vanilla-gui"
kv "Dashboard" "http://localhost:3000"
kv "Agent state" "${HOME}/.vanilla-agent"
kv "Dependencies" "$DEPS_RESULT"
[ -x "${PREFIX}/lib/uninstall.sh" ] && kv "Uninstall" "${PREFIX}/lib/uninstall.sh"
rule

printf "\n  %sNext steps%s\n" "$C_BOLD$C_WHITE" "$C_RESET"
if [ "$DO_LINKS" = "1" ]; then
  printf "    %svanilla-gui%s      launch the runtime and open the control panel\n" "$C_TEAL" "$C_RESET"
  printf "    %svanilla --run%s     start the agent without a browser\n" "$C_TEAL" "$C_RESET"
  printf "    %svanilla-cli doctor%s  check your environment\n" "$C_TEAL" "$C_RESET"
else
  printf "    %s%s/vanilla-gui%s   launch the runtime and open the control panel\n" "$C_TEAL" "$PREFIX" "$C_RESET"
fi
printf "\n  %sOn first launch, the setup wizard asks for an AI brain — Ollama for a%s\n" "$C_SLATE" "$C_RESET"
printf "  %sfree local model, or an API key from OpenAI, Anthropic, Google or xAI.%s\n\n" "$C_SLATE" "$C_RESET"

if [ "$DO_LAUNCH" = "1" ]; then
  exec "${PREFIX}/vanilla-gui"
fi
if [ "${ASSUME_YES:-0}" != "1" ] && [ -t 0 ]; then
  if confirm "Launch VanillaAgent now?" "y"; then
    exec "${PREFIX}/vanilla-gui"
  fi
fi
exit 0

__VA_PAYLOAD_BELOW__
