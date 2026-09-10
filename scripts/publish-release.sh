#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════
#  VanillaAgent Release Publisher
#  ─────────────────────────────
#  Creates (or updates) a GitHub Release for the given tag and attaches
#  every installer artifact from the releases/ directory.
#
#  Flags:
#    --skip-build   do not run `pnpm installers` before uploading
#    --dry-run      print what would be uploaded without actually uploading
#    <tag>          the git tag to release (e.g. v0.2.1); defaults to
#                   the current HEAD tag or the version in package.json
#
#  Requires: gh (GitHub CLI) authenticated with a token that has
#            `contents: write` permission on the repository.
# ═══════════════════════════════════════════════════════════════════════════
set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${REPO_ROOT}"

# ── Console theme ───────────────────────────────────────────────
if [ -t 1 ] && [ -z "${NO_COLOR:-}" ]; then
  TEAL=$'\033[38;2;45;212;191m'; BRAND=$'\033[38;2;20;184;166m'
  WHITE=$'\033[38;2;226;232;240m'; DIM=$'\033[2m'; RESET=$'\033[0m'
  AMBER=$'\033[38;2;251;191;36m'; ROSE=$'\033[38;2;251;113;133m'; BOLD=$'\033[1m'
else
  TEAL=""; BRAND=""; WHITE=""; DIM=""; RESET=""; AMBER=""; ROSE=""; BOLD=""
fi

h1() { printf "\n%s%s%s %s%s%s\n" "$TEAL" "◆" "$RESET" "$BOLD$WHITE" "$1" "$RESET"; }
note() { printf "  %s·%s %s%s%s\n" "$DIM" "$RESET" "$DIM" "$1" "$RESET"; }
warn() { printf "  %s!%s %s%s%s\n" "$AMBER" "$RESET" "$AMBER" "$1" "$RESET"; }
err() { printf "  %s✗%s %s%s%s\n" "$ROSE" "$RESET" "$ROSE" "$1" "$RESET"; }

# ── Parse flags ─────────────────────────────────────────────────
SKIP_BUILD=0
DRY_RUN=0
TAG=""

while [ $# -gt 0 ]; do
  case "$1" in
    --skip-build) SKIP_BUILD=1; shift ;;
    --dry-run) DRY_RUN=1; shift ;;
    -h|--help) sed -n '2,20p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    -*) err "Unknown option: $1"; exit 1 ;;
    *) TAG="$1"; shift ;;
  esac
done

# ── Resolve the tag ─────────────────────────────────────────────
VERSION="$(node -p "require('./package.json').version")"
if [ -z "$TAG" ]; then
  # Try the current git tag first
  TAG="$(git tag --points-at HEAD 2>/dev/null | head -1)"
fi
if [ -z "$TAG" ]; then
  TAG="v${VERSION}"
fi

# Normalize: ensure it starts with "v"
[[ "$TAG" == v* ]] || TAG="v${TAG}"

RELEASE_DIR="${RELEASE_DIR:-releases}"

printf "\n"
printf "%s%s╭──────────────────────────────────────────────────────────────────────╮%s\n" "$TEAL" "$BOLD" "$RESET"
printf "%s%s│%s  %sVanillaAgent Release Publisher%s                     %s%s%s             %s│%s\n" "$TEAL" "$BOLD" "$RESET" "$BOLD$WHITE" "$RESET" "$DIM" "$TAG" "$RESET" "$TEAL" "$RESET"
printf "%s%s╰──────────────────────────────────────────────────────────────────────╯%s\n\n" "$TEAL" "$BOLD" "$RESET"

# ── Sanity checks ───────────────────────────────────────────────
if ! command -v gh >/dev/null 2>&1; then
  err "gh (GitHub CLI) not found. Install it from https://cli.github.com"
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  err "gh is not authenticated. Run: gh auth login"
  exit 1
fi

if [ ! -d "$RELEASE_DIR" ]; then
  err "releases/ directory missing. Run: pnpm installers"
  exit 1
fi

# ── Build (optional) ────────────────────────────────────────────
if [ "$SKIP_BUILD" = "0" ]; then
  h1 "Building installers"
  bash scripts/build-installers.sh
fi

# ── Collect artifacts ───────────────────────────────────────────
h1 "Collecting release artifacts"

# Core artifacts: every installer + metadata files
ARTIFACTS=()
for f in \
  "${RELEASE_DIR}/VanillaAgent-${VERSION}-macOS-AppleSilicon.pkg" \
  "${RELEASE_DIR}/VanillaAgent-${VERSION}-macOS-Intel.pkg" \
  "${RELEASE_DIR}/VanillaAgent-${VERSION}-Windows-x64-Setup.exe" \
  "${RELEASE_DIR}/vanilla-agent_${VERSION}_amd64.deb" \
  "${RELEASE_DIR}/vanilla-agent_${VERSION}_arm64.deb" \
  "${RELEASE_DIR}/vanilla-agent-${VERSION}-1.x86_64.rpm" \
  "${RELEASE_DIR}/vanilla-agent-${VERSION}-1.aarch64.rpm" \
  "${RELEASE_DIR}/VanillaAgent-${VERSION}-unix-installer.sh" \
  "${RELEASE_DIR}/SHA256SUMS.txt" \
  "${RELEASE_DIR}/installers-manifest.json" \
  "${RELEASE_DIR}/index.html"; do
  if [ -f "$f" ]; then
    ARTIFACTS+=("$f")
    note "$(basename "$f")  ($(du -h "$f" | cut -f1))"
  else
    warn "missing: $(basename "$f")"
  fi
done

if [ ${#ARTIFACTS[@]} -eq 0 ]; then
  err "No artifacts found. Build the installers first."
  exit 1
fi

# ── Dry run ─────────────────────────────────────────────────────
if [ "$DRY_RUN" = "1" ]; then
  h1 "Dry run"
  note "Would create/update release ${TAG} with ${#ARTIFACTS[@]} assets"
  for f in "${ARTIFACTS[@]}"; do
    printf "    upload: %s\n" "$(basename "$f")"
  done
  exit 0
fi

# ── Create or update the GitHub Release ─────────────────────────
h1 "Publishing release ${TAG}"

# Generate release notes from the manifest if available
NOTES_FILE=""
if [ -f "${RELEASE_DIR}/installers-manifest.json" ]; then
  NOTES_FILE=$(mktemp)
  cat > "$NOTES_FILE" << 'RELEASE_NOTES_HEADER'
## VanillaAgent 0.2.1 — Native Installers

Cross-platform, themed installers for macOS, Windows and Linux.

RELEASE_NOTES_HEADER

  # Append the download table
  node -e "
const m = require('./${RELEASE_DIR}/installers-manifest.json');
const lines = ['| Platform | Installer | Size |', '|---|---|---|'];
for (const a of m.artifacts) {
  lines.push('| ' + a.label + ' | \`' + a.file + '\` | ' + a.sizeLabel + ' |');
}
console.log(lines.join('\n'));
" >> "$NOTES_FILE" 2>/dev/null || true

  cat >> "$NOTES_FILE" << 'RELEASE_NOTES_FOOTER'

### Verify your download

```bash
# macOS / Linux
shasum -a 256 --check SHA256SUMS.txt

# Linux (GNU coreutils)
sha256sum -c SHA256SUMS.txt

# Windows (PowerShell)
Get-FileHash .\VanillaAgent-0.2.1-Windows-x64-Setup.exe -Algorithm SHA256
```

### Install

Download the installer for your platform from the assets below, or visit the
[themed download page](releases/index.html) in this repository.

RELEASE_NOTES_FOOTER
fi

# Check if the release already exists
if gh release view "$TAG" >/dev/null 2>&1; then
  note "Release ${TAG} already exists — updating assets"
  if [ -n "$NOTES_FILE" ]; then
    gh release edit "$TAG" \
      --notes-file "$NOTES_FILE" \
      --title "VanillaAgent ${TAG}" \
      || true
  fi
else
  note "Creating release ${TAG}"
  CREATE_ARGS=(--title "VanillaAgent ${TAG}" --target "$(git rev-parse HEAD)")
  if [ -n "$NOTES_FILE" ]; then
    CREATE_ARGS+=(--notes-file "$NOTES_FILE")
  else
    CREATE_ARGS+=(--notes "VanillaAgent ${TAG} — native installers for macOS, Windows and Linux.")
  fi
  gh release create "$TAG" "${CREATE_ARGS[@]}" || {
    err "Failed to create release"
    rm -f "$NOTES_FILE"
    exit 1
  }
fi

rm -f "$NOTES_FILE"

# Upload artifacts
h1 "Uploading ${#ARTIFACTS[@]} assets"
gh release upload "$TAG" "${ARTIFACTS[@]}" --clobber || {
  err "Failed to upload some assets"
  exit 1
}

# ── Summary ─────────────────────────────────────────────────────
printf "\n%s%s◆  Release %s published%s\n" "$BOLD" "$TEAL" "$TAG" "$RESET"
printf "  %s✓%s %s%d assets attached%s\n" "$TEAL" "$RESET" "$DIM" "${#ARTIFACTS[@]}" "$RESET"

RELEASE_URL="$(gh release view "$TAG" --json url -q '.url' 2>/dev/null)"
if [ -n "$RELEASE_URL" ]; then
  printf "  %s🔗%s %s%s%s\n" "$TEAL" "$RESET" "$WHITE" "$RELEASE_URL" "$RESET"
fi
printf "\n"
