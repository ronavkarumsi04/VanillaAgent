#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# VanillaAgent Windows Installer Builder (NSIS)
#
# Compiles scripts/installers/vanilla-agent.nsi into a themed
# Setup .exe with makensis.
#
# Environment:
#   MAKENSIS   path to the makensis binary (auto-detected)
#   NSISDIR    NSIS data directory (Stubs/, Plugins/, Include/)
# ─────────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

VERSION="${VERSION:-$(node -p "require('${REPO_ROOT}/package.json').version")}"
PAYLOAD="${PAYLOAD:-${REPO_ROOT}/build/payload}"
ASSETS="${ASSETS:-${REPO_ROOT}/build/brand}"
OUT="${OUT:-${REPO_ROOT}/releases/VanillaAgent-${VERSION}-Windows-x64-Setup.exe}"
WORK="${WORK:-${REPO_ROOT}/build/stage/windows}"

# ── Locate makensis ──────────────────────────────────────────
MAKENSIS="${MAKENSIS:-}"
if [ -z "${MAKENSIS}" ]; then
  for candidate in makensis /usr/bin/makensis /usr/local/bin/makensis \
                   /opt/nsis-bin/makensis /opt/nsis/makensis "${HOME}/.local/bin/makensis"; do
    if command -v "${candidate}" >/dev/null 2>&1; then
      MAKENSIS="$(command -v "${candidate}")"
      break
    fi
    if [ -x "${candidate}" ]; then
      MAKENSIS="${candidate}"
      break
    fi
  done
fi

if [ -z "${MAKENSIS}" ] || [ ! -x "${MAKENSIS}" ]; then
  echo "  ! makensis not found — skipping the Windows installer."
  echo "    Install NSIS (Debian/Ubuntu: sudo apt-get install nsis,"
  echo "    macOS: brew install nsis) or set MAKENSIS=/path/to/makensis."
  exit 0
fi

# ── Locate the NSIS data directory ───────────────────────────
if [ -z "${NSISDIR:-}" ]; then
  for dir in /usr/local/share/nsis /usr/share/nsis /opt/nsis "${HOME}/.local/share/nsis"; do
    if [ -d "${dir}/Stubs" ] && [ -d "${dir}/Include" ]; then
      export NSISDIR="${dir}"
      break
    fi
  done
else
  export NSISDIR
fi

mkdir -p "${WORK}"
mkdir -p "$(dirname "${OUT}")"

# ── Render the script with real paths ────────────────────────
sed -e "s|@@VERSION@@|${VERSION}|g" \
    -e "s|@@PAYLOAD@@|${PAYLOAD}|g" \
    -e "s|@@ASSETS@@|${ASSETS}|g" \
    -e "s|@@OUTFILE@@|${OUT}|g" \
    "${SCRIPT_DIR}/vanilla-agent.nsi" > "${WORK}/installer.nsi"

echo "  ▸ compiling Windows installer (NSIS ${NSISDIR:-default})"
"${MAKENSIS}" -V2 -NOCD "${WORK}/installer.nsi" 2>&1 | sed 's/^/      /'

if [ -f "${OUT}" ]; then
  SIZE="$(du -h "${OUT}" | cut -f1)"
  echo "  ✓ ${OUT#${REPO_ROOT}/} (${SIZE})"
else
  echo "  ✗ makensis did not produce ${OUT}"
  exit 1
fi
