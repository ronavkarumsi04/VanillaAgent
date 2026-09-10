#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# VanillaAgent Debian/Ubuntu Package Builder
#
# Produces a .deb that installs the runtime into /opt/vanilla-agent
# and wires up /usr/bin launchers, a desktop entry, icons and an
# optional systemd user service.
# ─────────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
TEMPLATES="${SCRIPT_DIR}/templates/linux"

ARCH="${ARCH:-amd64}"
VERSION="${VERSION:-$(node -p "require('${REPO_ROOT}/package.json').version")}"
PAYLOAD="${PAYLOAD:-${REPO_ROOT}/build/payload}"
ASSETS="${ASSETS:-${REPO_ROOT}/build/brand}"
OUT="${OUT:-${REPO_ROOT}/releases/vanilla-agent_${VERSION}_${ARCH}.deb}"
WORK="${WORK:-${REPO_ROOT}/build/stage/deb/${ARCH}}"

PREFIX="/opt/vanilla-agent"

echo "  ▸ Debian package (${ARCH})"

rm -rf "${WORK}"
mkdir -p "${WORK}/DEBIAN"
mkdir -p "${WORK}${PREFIX}"
mkdir -p "${WORK}/usr/bin"
mkdir -p "${WORK}/usr/share/applications"
mkdir -p "${WORK}/usr/share/icons/hicolor/512x512/apps"
mkdir -p "${WORK}/usr/share/metainfo"
mkdir -p "${WORK}/usr/lib/systemd/user"

# ── Payload ──────────────────────────────────────────────────
cp -a "${PAYLOAD}/." "${WORK}${PREFIX}/"
chmod 755 "${WORK}${PREFIX}/vanilla" "${WORK}${PREFIX}/vanilla-gui" "${WORK}${PREFIX}/vanilla-cli"
chmod 755 "${WORK}${PREFIX}/lib/uninstall.sh" 2>/dev/null || true

# ── Launcher symlinks ────────────────────────────────────────
ln -s "${PREFIX}/vanilla"      "${WORK}/usr/bin/vanilla"
ln -s "${PREFIX}/vanilla-gui"  "${WORK}/usr/bin/vanilla-gui"
ln -s "${PREFIX}/vanilla-cli"  "${WORK}/usr/bin/vanilla-cli"

# ── Desktop integration ──────────────────────────────────────
cp "${TEMPLATES}/vanilla-agent.desktop" "${WORK}/usr/share/applications/vanilla-agent.desktop"
cp "${ASSETS}/logo-512.png" "${WORK}/usr/share/icons/hicolor/512x512/apps/vanillaagent.png"

sed -e "s|@@VERSION@@|${VERSION}|g" \
    -e "s|@@DATE@@|$(date -u +%Y-%m-%d)|g" \
    "${TEMPLATES}/com.vanillaagent.runtime.metainfo.xml" \
    > "${WORK}/usr/share/metainfo/com.vanillaagent.runtime.metainfo.xml"

sed "s|@@EXEC_START@@|${PREFIX}/vanilla --run|" "${TEMPLATES}/vanilla-agent.service" \
    > "${WORK}/usr/lib/systemd/user/vanilla-agent.service"

# ── Control ──────────────────────────────────────────────────
INSTALLED_SIZE="$(du -sk "${WORK}${PREFIX}" | cut -f1)"

cat > "${WORK}/DEBIAN/control" <<EOF
Package: vanilla-agent
Version: ${VERSION}
Section: utils
Priority: optional
Architecture: ${ARCH}
Maintainer: VanillaAgent <maintainers@vanillaagent.dev>
Homepage: https://github.com/ronavkarumsi04/VanillaAgent
Depends: ca-certificates, curl
Recommends: nodejs (>= 20.0.0)
Suggests: ollama, git
Installed-Size: ${INSTALLED_SIZE}
Description: Sovereign autonomous AI agent runtime and swarm engine
 VanillaAgent is a sovereign autonomous agent runtime: it holds its own EVM and
 Solana wallet, pays for its own compute, keeps a five-tier cognitive memory and
 coordinates work inside multi-agent swarms.
 .
 This package installs the runtime into ${PREFIX}, exposes the vanilla,
 vanilla-gui and vanilla-cli commands, ships a desktop entry for the Web GUI
 control panel served on http://localhost:3000 and an optional systemd user
 service (vanilla-agent.service).
EOF

# ── Maintainer scripts ───────────────────────────────────────
cat > "${WORK}/DEBIAN/postinst" <<'EOF'
#!/bin/sh
set -e

PREFIX="/opt/vanilla-agent"
LOG="/var/log/vanilla-agent-install.log"

node_major() {
  node -v 2>/dev/null | sed 's/^v//' | cut -d. -f1
}

echo "VanillaAgent: postinst" >> "$LOG" 2>&1 || true

chmod -R a+rX "$PREFIX" 2>/dev/null || true
chmod 755 "$PREFIX/vanilla" "$PREFIX/vanilla-gui" "$PREFIX/vanilla-cli" 2>/dev/null || true

if command -v node >/dev/null 2>&1; then
  MAJOR="$(node_major)"
  if [ -n "$MAJOR" ] && [ "$MAJOR" -ge 20 ] 2>/dev/null; then
    echo "VanillaAgent: resolving runtime dependencies" >> "$LOG" 2>&1 || true
    ( cd "$PREFIX" && timeout 900 npm install --omit=dev --no-audit --no-fund ) >> "$LOG" 2>&1 \
      || echo "VanillaAgent: npm install failed; the launcher retries on first run" >> "$LOG" 2>&1 || true
  else
    echo "VanillaAgent: Node.js $(node -v 2>/dev/null || echo unknown) detected - version 20 or newer is required." >&2
    echo "VanillaAgent: see https://nodejs.org/en/download/package-manager" >&2
  fi
else
  echo "VanillaAgent: Node.js was not found. Install Node.js 20+ (https://nodejs.org) then run: vanilla --run" >&2
fi

if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database -q /usr/share/applications >/dev/null 2>&1 || true
fi
if command -v gtk-update-icon-cache >/dev/null 2>&1; then
  gtk-update-icon-cache -q -t -f /usr/share/icons/hicolor >/dev/null 2>&1 || true
fi
if command -v systemctl >/dev/null 2>&1; then
  systemctl --user daemon-reload >/dev/null 2>&1 || systemctl daemon-reload >/dev/null 2>&1 || true
fi

cat <<'BANNER'

  ◆ VanillaAgent is installed.

    vanilla-gui       launch the runtime + Web GUI on http://localhost:3000
    vanilla --run     start the sovereign agent runtime
    vanilla-cli       creator CLI (status, doctor, logs, memory)

BANNER

exit 0
EOF

cat > "${WORK}/DEBIAN/prerm" <<'EOF'
#!/bin/sh
set -e
if command -v systemctl >/dev/null 2>&1; then
  systemctl --user stop vanilla-agent.service >/dev/null 2>&1 || true
  systemctl --user disable vanilla-agent.service >/dev/null 2>&1 || true
fi
exit 0
EOF

cat > "${WORK}/DEBIAN/postrm" <<'EOF'
#!/bin/sh
set -e
if [ "$1" = "purge" ]; then
  rm -rf /opt/vanilla-agent/node_modules 2>/dev/null || true
  rm -rf /opt/vanilla-agent 2>/dev/null || true
  rm -f /var/log/vanilla-agent-install.log 2>/dev/null || true
fi
if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database -q /usr/share/applications >/dev/null 2>&1 || true
fi
if command -v systemctl >/dev/null 2>&1; then
  systemctl --user daemon-reload >/dev/null 2>&1 || systemctl daemon-reload >/dev/null 2>&1 || true
fi
exit 0
EOF

chmod 755 "${WORK}/DEBIAN/postinst" "${WORK}/DEBIAN/prerm" "${WORK}/DEBIAN/postrm"

# ── Build ────────────────────────────────────────────────────
mkdir -p "$(dirname "${OUT}")"
dpkg-deb --root-owner-group --build "${WORK}" "${OUT}" >/dev/null

# Validate
dpkg-deb --info "${OUT}" >/dev/null
FILES=$(dpkg-deb --fsys-tarfile "${OUT}" | tar -tf - | wc -l)
echo "  ✓ ${OUT#${REPO_ROOT}/} ($(du -h "${OUT}" | cut -f1), ${FILES} entries)"
