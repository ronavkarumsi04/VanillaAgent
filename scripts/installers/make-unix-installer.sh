#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# VanillaAgent Universal Installer Builder
#
# Produces a single self-extracting shell installer that works on macOS and
# Linux: branded TUI, dependency bootstrap, launchers, desktop entry and an
# uninstaller. The payload is a tar.gz appended after the script, guarded by a
# SHA-256 checksum.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

VERSION="${VERSION:-$(node -p "require('${REPO_ROOT}/package.json').version")}"
PAYLOAD="${PAYLOAD:-${REPO_ROOT}/build/payload}"
OUT="${OUT:-${REPO_ROOT}/releases/VanillaAgent-${VERSION}-unix-installer.sh}"
WORK="${WORK:-${REPO_ROOT}/build/stage/unix}"

echo "  ▸ universal shell installer"

rm -rf "${WORK}"
mkdir -p "${WORK}"

# ── Payload tarball (deterministic ordering) ───────────────────
(
  cd "${PAYLOAD}"
  find . -print0 | LC_ALL=C sort -z | tar --no-recursion --null -czf "${WORK}/payload.tar.gz" --files-from=-
)

if command -v sha256sum >/dev/null 2>&1; then
  SUM="$(sha256sum "${WORK}/payload.tar.gz" | awk '{print $1}')"
else
  SUM="$(shasum -a 256 "${WORK}/payload.tar.gz" | awk '{print $1}')"
fi

# ── Script header ──────────────────────────────────────────────
sed -e "s|@@VERSION@@|${VERSION}|g" -e "s|@@PAYLOAD_SHA256@@|${SUM}|g" \
    "${SCRIPT_DIR}/templates/unix-install.sh" > "${WORK}/installer.sh"

# ── Validate the script header (before the binary payload is appended) ──────
bash -n "${WORK}/installer.sh" || { echo "  ✗ installer script has a syntax error"; exit 1; }

mkdir -p "$(dirname "${OUT}")"
cat "${WORK}/installer.sh" "${WORK}/payload.tar.gz" > "${OUT}"
chmod 755 "${OUT}"
SIZE="$(du -h "${OUT}" | cut -f1)"
echo "  ✓ ${OUT#${REPO_ROOT}/} (${SIZE})"
