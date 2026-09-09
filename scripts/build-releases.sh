#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────────────────────
# VanillaAgent Cross-Platform Release Packager
# Builds distribution bundles for macOS (ARM64 & Intel), Windows, and Linux
# ─────────────────────────────────────────────────────────────

VERSION="0.2.1"
DIST_DIR="releases"

echo "========================================================"
echo "  📦 Building VanillaAgent v${VERSION} Cross-Platform Releases"
echo "========================================================"

# Step 1: Clean and build TypeScript artifacts
echo "Step 1: Compiling TypeScript source & CLI..."
if [ ! -d "node_modules" ]; then
  pnpm install --ignore-scripts
fi
pnpm build

# Step 2: Prepare Release Output Directory
rm -rf "${DIST_DIR}"
mkdir -p "${DIST_DIR}"

TARGETS=(
  "macos-arm64:Apple Silicon (M1/M2/M3/M4)"
  "macos-x64:Mac Intel (x64)"
  "windows-x64:Windows 64-bit"
  "linux-x64:Linux (x64)"
  "linux-arm64:Linux (ARM64)"
)

for TARGET_PAIR in "${TARGETS[@]}"; do
  TARGET_ID="${TARGET_PAIR%%:*}"
  TARGET_NAME="${TARGET_PAIR##*:}"
  BUNDLE_NAME="vanilla-agent-v${VERSION}-${TARGET_ID}"
  STAGE_DIR="/tmp/${BUNDLE_NAME}"

  echo "Packaging: ${TARGET_NAME} -> ${BUNDLE_NAME}..."
  rm -rf "${STAGE_DIR}"
  mkdir -p "${STAGE_DIR}"

  # Copy compiled artifacts and configs
  cp -r dist "${STAGE_DIR}/dist"
  cp -r packages "${STAGE_DIR}/packages"
  cp package.json "${STAGE_DIR}/"
  cp pnpm-workspace.yaml "${STAGE_DIR}/"
  cp constitution.md "${STAGE_DIR}/"
  cp README.md "${STAGE_DIR}/"
  cp LICENSE "${STAGE_DIR}/"

  # Copy skills
  if [ -d "src/skills/built-in" ]; then
    mkdir -p "${STAGE_DIR}/skills"
    cp -r src/skills/built-in/* "${STAGE_DIR}/skills/"
  fi

  # Create OS-specific Launchers
  if [[ "${TARGET_ID}" == *"windows"* ]]; then
    cat << 'EOF' > "${STAGE_DIR}/vanilla.cmd"
@echo off
node "%~dp0dist\index.js" %*
EOF
    cat << 'EOF' > "${STAGE_DIR}/vanilla-gui.cmd"
@echo off
echo Starting VanillaAgent Web GUI...
start http://localhost:3000
node "%~dp0dist\index.js" --run
EOF
    # Create ZIP archive
    (cd /tmp && zip -r -q "${BUNDLE_NAME}.zip" "${BUNDLE_NAME}")
    mv "/tmp/${BUNDLE_NAME}.zip" "${DIST_DIR}/"
    echo "  ✓ Created: ${DIST_DIR}/${BUNDLE_NAME}.zip"
  else
    cat << 'EOF' > "${STAGE_DIR}/vanilla"
#!/usr/bin/env bash
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec node "${DIR}/dist/index.js" "$@"
EOF
    chmod +x "${STAGE_DIR}/vanilla"

    cat << 'EOF' > "${STAGE_DIR}/vanilla-gui"
#!/usr/bin/env bash
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo "Starting VanillaAgent Web GUI on http://localhost:3000..."
if command -v open > /dev/null; then
  (sleep 1 && open "http://localhost:3000") &
elif command -v xdg-open > /dev/null; then
  (sleep 1 && xdg-open "http://localhost:3000") &
fi
exec node "${DIR}/dist/index.js" --run
EOF
    chmod +x "${STAGE_DIR}/vanilla-gui"

    # Create TAR.GZ archive
    tar -czf "${DIST_DIR}/${BUNDLE_NAME}.tar.gz" -C /tmp "${BUNDLE_NAME}"
    echo "  ✓ Created: ${DIST_DIR}/${BUNDLE_NAME}.tar.gz"
  fi

  rm -rf "${STAGE_DIR}"
done

# Step 3: Compute Checksums
echo ""
echo "Generating cryptographic SHA256 checksums..."
(
  cd "${DIST_DIR}"
  sha256sum * > SHA256SUMS.txt
)

# Step 4: Write Release Manifest JSON
cat << EOF > "${DIST_DIR}/release-manifest.json"
{
  "name": "VanillaAgent",
  "version": "${VERSION}",
  "releaseDate": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "packages": [
    {
      "os": "macos",
      "arch": "arm64",
      "platform": "Apple Silicon (M1/M2/M3/M4)",
      "file": "vanilla-agent-v${VERSION}-macos-arm64.tar.gz"
    },
    {
      "os": "macos",
      "arch": "x64",
      "platform": "Mac Intel",
      "file": "vanilla-agent-v${VERSION}-macos-x64.tar.gz"
    },
    {
      "os": "windows",
      "arch": "x64",
      "platform": "Windows 64-bit",
      "file": "vanilla-agent-v${VERSION}-windows-x64.zip"
    },
    {
      "os": "linux",
      "arch": "x64",
      "platform": "Linux (x64)",
      "file": "vanilla-agent-v${VERSION}-linux-x64.tar.gz"
    },
    {
      "os": "linux",
      "arch": "arm64",
      "platform": "Linux (ARM64)",
      "file": "vanilla-agent-v${VERSION}-linux-arm64.tar.gz"
    }
  ]
}
EOF

echo ""
echo "========================================================"
echo "  🎉 All cross-platform release packages created in ${DIST_DIR}/:"
ls -lh "${DIST_DIR}"
echo "========================================================"
