#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════
#  VanillaAgent Native Installer Factory
#  ─────────────────────────────────────
#  Builds themed, platform-native installers for every supported target:
#
#    Mac (Apple Silicon)   VanillaAgent-<ver>-macOS-AppleSilicon.pkg
#    Mac (Intel)           VanillaAgent-<ver>-macOS-Intel.pkg
#    Windows 64-bit        VanillaAgent-<ver>-Windows-x64-Setup.exe
#    Linux (deb)           vanilla-agent_<ver>_amd64.deb / _arm64.deb
#    Linux (rpm)           vanilla-agent-<ver>-1.x86_64.rpm / .aarch64.rpm
#    macOS + Linux         VanillaAgent-<ver>-unix-installer.sh
#
#  …plus SHA256SUMS.txt, installers-manifest.json and a themed download page.
#
#  Tools are detected at runtime; a missing tool skips its target instead of
#  failing the whole build (see the summary at the end).
#
#  Usage:  ./scripts/build-installers.sh [--archives] [--only pkg|exe|deb|rpm|unix]
# ═══════════════════════════════════════════════════════════════════════════
set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${REPO_ROOT}"

SCRIPTS="scripts/installers"
BUILD_DIR="build"
RELEASE_DIR="${RELEASE_DIR:-releases}"
PAYLOAD_DIR="${BUILD_DIR}/payload"
BRAND_DIR="${BUILD_DIR}/brand"

VERSION="$(node -p "require('./package.json').version")"

WITH_ARCHIVES=0
ONLY=""
while [ $# -gt 0 ]; do
  case "$1" in
    --archives) WITH_ARCHIVES=1; shift ;;
    --only) ONLY="$2"; shift 2 ;;
    --version) VERSION="$2"; shift 2 ;;
    -h|--help) sed -n '2,20p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

# ── Console theme ───────────────────────────────────────────────
if [ -t 1 ] && [ -z "${NO_COLOR:-}" ]; then
  TEAL=$'\033[38;2;45;212;191m'; BRAND=$'\033[38;2;20;184;166m'
  WHITE=$'\033[38;2;226;232;240m'; DIM=$'\033[2m'; RESET=$'\033[0m'
  AMBER=$'\033[38;2;251;191;36m'; ROSE=$'\033[38;2;251;113;133m'; BOLD=$'\033[1m'
else
  TEAL=""; BRAND=""; WHITE=""; DIM=""; RESET=""; AMBER=""; ROSE=""; BOLD=""
fi

should() { [ -z "$ONLY" ] || [ "$ONLY" = "$1" ]; }
h1() { printf "\n%s%s%s %s%s%s\n" "$TEAL" "◆" "$RESET" "$BOLD$WHITE" "$1" "$RESET"; }
note() { printf "  %s·%s %s%s%s\n" "$DIM" "$RESET" "$DIM" "$1" "$RESET"; }

printf "\n"
printf "%s%s╭──────────────────────────────────────────────────────────────────────╮%s\n" "$TEAL" "$BOLD" "$RESET"
printf "%s%s│%s  %sVanillaAgent Installer Factory%s                    %sv%s%s             %s│%s\n" "$TEAL" "$BOLD" "$RESET" "$BOLD$WHITE" "$RESET" "$DIM" "$VERSION" "$RESET" "$TEAL" "$RESET"
printf "%s%s╰──────────────────────────────────────────────────────────────────────╯%s\n\n" "$TEAL" "$BOLD" "$RESET"

SKIPPED=()
BUILT=()

# ───────────────────────────────────────────────────────────────
h1 "1/5  Brand assets"
# ───────────────────────────────────────────────────────────────
if ! python3 "${SCRIPTS}/make-brand.py" --version "${VERSION}" --out "${BRAND_DIR}"; then
  echo "  ${ROSE}✗ brand generation failed${RESET}"
  exit 1
fi

# ───────────────────────────────────────────────────────────────
h1 "2/5  Compiled runtime + payload"
# ───────────────────────────────────────────────────────────────
if [ ! -d dist ]; then
  note "dist/ missing — compiling TypeScript"
  if command -v pnpm >/dev/null 2>&1; then pnpm build || exit 1
  elif command -v npm >/dev/null 2>&1; then npm run build || exit 1
  else echo "  ${ROSE}✗ neither pnpm nor npm found${RESET}"; exit 1; fi
fi

node "${SCRIPTS}/stage-payload.mjs" --out "${PAYLOAD_DIR}" --assets "${BRAND_DIR}" || exit 1

# ───────────────────────────────────────────────────────────────
h1 "3/5  Native installers"
# ───────────────────────────────────────────────────────────────

# ── macOS ──
if should pkg; then
  for arch in arm64 x64; do
    if [ "$arch" = "arm64" ]; then
      OUT="${RELEASE_DIR}/VanillaAgent-${VERSION}-macOS-AppleSilicon.pkg"
    else
      OUT="${RELEASE_DIR}/VanillaAgent-${VERSION}-macOS-Intel.pkg"
    fi
    if node "${SCRIPTS}/make-pkg.mjs" --arch "$arch" \
        --payload "${PAYLOAD_DIR}" --assets "${BRAND_DIR}" --out "$OUT"; then
      BUILT+=("$OUT")
    else
      SKIPPED+=("macOS $arch package")
    fi
  done
fi

# ── Windows ──
if should exe; then
  OUT="${RELEASE_DIR}/VanillaAgent-${VERSION}-Windows-x64-Setup.exe"
  if VERSION="${VERSION}" PAYLOAD="${REPO_ROOT}/${PAYLOAD_DIR}" ASSETS="${REPO_ROOT}/${BRAND_DIR}" \
      OUT="${REPO_ROOT}/${OUT}" bash "${SCRIPTS}/make-exe.sh"; then
    [ -f "$OUT" ] && BUILT+=("$OUT") || SKIPPED+=("Windows installer (makensis unavailable)")
  else
    SKIPPED+=("Windows installer")
  fi
fi

# ── Debian / Ubuntu ──
if should deb; then
  if command -v dpkg-deb >/dev/null 2>&1; then
    for arch in amd64 arm64; do
      OUT="${RELEASE_DIR}/vanilla-agent_${VERSION}_${arch}.deb"
      if ARCH="$arch" VERSION="${VERSION}" PAYLOAD="${REPO_ROOT}/${PAYLOAD_DIR}" \
          ASSETS="${REPO_ROOT}/${BRAND_DIR}" OUT="${REPO_ROOT}/${OUT}" \
          bash "${SCRIPTS}/make-deb.sh" >/dev/null; then
        BUILT+=("$OUT")
      fi
    done
  else
    SKIPPED+=("Debian packages (dpkg-deb unavailable)")
  fi
fi

# ── Fedora / RHEL / openSUSE ──
if should rpm; then
  if command -v python3 >/dev/null 2>&1; then
    for arch in x86_64 aarch64; do
      OUT="${RELEASE_DIR}/vanilla-agent-${VERSION}-1.${arch}.rpm"
      if python3 "${SCRIPTS}/make-rpm.py" --arch "$arch" --version "${VERSION}" \
          --payload "${PAYLOAD_DIR}" --assets "${BRAND_DIR}" --out "$OUT" >/dev/null; then
        BUILT+=("$OUT")
      fi
    done
  else
    SKIPPED+=("RPM packages (python3 unavailable)")
  fi
fi

# ── Universal shell installer ──
if should unix; then
  OUT="${RELEASE_DIR}/VanillaAgent-${VERSION}-unix-installer.sh"
  if VERSION="${VERSION}" PAYLOAD="${REPO_ROOT}/${PAYLOAD_DIR}" OUT="${REPO_ROOT}/${OUT}" \
      bash "${SCRIPTS}/make-unix-installer.sh" >/dev/null; then
    BUILT+=("$OUT")
  fi
fi

# ── Portable archives (optional) ──
if [ "$WITH_ARCHIVES" = "1" ]; then
  h1 "3b/5  Portable archives"
  if [ -x scripts/build-releases.sh ]; then
    ./scripts/build-releases.sh >/dev/null 2>&1 && note "portable zip/tar.gz archives rebuilt"
  fi
fi

# ───────────────────────────────────────────────────────────────
h1 "4/5  Checksums and manifest"
# ───────────────────────────────────────────────────────────────
mkdir -p "${RELEASE_DIR}"

if [ ${#BUILT[@]} -gt 0 ]; then
  (
    cd "${RELEASE_DIR}"
    for f in "${BUILT[@]}"; do
      base="$(basename "$f")"
      if command -v sha256sum >/dev/null 2>&1; then
        sha256sum "$base"
      else
        shasum -a 256 "$base"
      fi
    done > SHA256SUMS.txt
  )
  note "SHA256SUMS.txt written for ${#BUILT[@]} artifacts"
fi

node "${SCRIPTS}/make-manifest.mjs" \
  --version "${VERSION}" \
  --dir "${RELEASE_DIR}" \
  --out "${RELEASE_DIR}/installers-manifest.json" || true

# ───────────────────────────────────────────────────────────────
h1 "4b/5  Verifying artifacts"
# ───────────────────────────────────────────────────────────────
if node "${SCRIPTS}/verify-installers.mjs" --manifest "${RELEASE_DIR}/installers-manifest.json" > /tmp/va-verify.log 2>&1; then
  note "$(grep -c '✓' /tmp/va-verify.log) structural checks passed"
  VERIFY_STATE="passed"
else
  cat /tmp/va-verify.log
  VERIFY_STATE="FAILED"
fi

# ───────────────────────────────────────────────────────────────
h1 "5/5  Download page"
# ───────────────────────────────────────────────────────────────
if node "${SCRIPTS}/make-download-page.mjs" \
    --manifest "${RELEASE_DIR}/installers-manifest.json" \
    --assets "${BRAND_DIR}" \
    --out "${RELEASE_DIR}/index.html"; then
  note "themed download page written"
fi

# ───────────────────────────────────────────────────────────────
printf "\n%s%s%s%s%s\n" "$BOLD" "$TEAL" "◆  " "Build complete" "$RESET"
[ "${VERIFY_STATE:-unknown}" = "passed" ] && printf "  %s✓%s %sall artifacts passed structural verification%s\n" "$TEAL" "$RESET" "$DIM" "$RESET"
[ "${VERIFY_STATE:-unknown}" = "FAILED" ] && printf "  %s!%s %sverification reported problems (see above)%s\n" "$AMBER" "$RESET" "$AMBER" "$RESET"
for f in "${BUILT[@]}"; do
  printf "  %s✓%s %s%s%s %s(%s)%s\n" "$TEAL" "$RESET" "$WHITE" "$(basename "$f")" "$RESET" "$DIM" "$(du -h "$f" | cut -f1)" "$RESET"
done
if [ ${#SKIPPED[@]} -gt 0 ]; then
  printf "\n  %sSkipped targets%s\n" "$AMBER" "$RESET"
  for s in "${SKIPPED[@]}"; do printf "    %s!%s %s%s%s\n" "$AMBER" "$RESET" "$DIM" "$s" "$RESET"; done
fi
printf "\n  %sArtifacts:%s %s%s/%s\n" "$DIM" "$RESET" "$WHITE" "$REPO_ROOT" "$RELEASE_DIR"
printf "  %sPreview:%s  %s%s/releases/index.html%s\n\n" "$DIM" "$RESET" "$WHITE" "$REPO_ROOT" "$RESET"
