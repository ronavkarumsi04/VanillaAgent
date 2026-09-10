#!/usr/bin/env node
/**
 * VanillaAgent macOS Installer Builder (.pkg)
 * ───────────────────────────────────────────
 * Builds genuine Apple flat packages (distribution format) without macOS:
 *
 *   Distribution.pkg (xar)
 *     ├── Distribution              installer script (title, background, RTFs)
 *     ├── background.png            themed installer background
 *     ├── welcome/readme/license/conclusion.rtf
 *     └── vanilla-agent.pkg         component package (xar)
 *            ├── Bom                bill of materials (mkbom)
 *            ├── PackageInfo        component metadata
 *            ├── Payload            gzipped cpio (odc) of the install tree
 *            └── Scripts            gzipped cpio (odc) with postinstall
 *
 * The package installs to /Applications/VanillaAgent and ships a real
 * VanillaAgent.app bundle (terminal launcher), CLI symlinks in /usr/local/bin
 * and a postinstall step that resolves runtime dependencies.
 *
 * Usage:
 *   node make-pkg.mjs --arch arm64 --payload build/payload --assets build/brand \
 *                     --out releases/VanillaAgent-0.2.1-macOS-arm64.pkg
 */

import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import mkbom from "mkbom";
import * as xarlib from "xar-js";
import * as xarutil from "xar-js/build/src/util.js";
import * as xario from "xar-js/build/src/io.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "..", "..");
const TEMPLATES = path.join(HERE, "templates");

const argv = process.argv.slice(2);
const opt = (flag, fallback) => {
  const i = argv.indexOf(flag);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};

const ARCH = opt("--arch", "arm64");
const HOST_ARCH = ARCH === "x64" ? "x86_64" : "arm64";
const PAYLOAD = path.resolve(opt("--payload", "build/payload"));
const ASSETS = path.resolve(opt("--assets", "build/brand"));
const OUT = path.resolve(opt("--out", `releases/VanillaAgent-macOS-${ARCH}.pkg`));
const WORK = path.resolve(opt("--work", `build/stage/macos/${ARCH}`));

const pkg = JSON.parse(fs.readFileSync(path.join(REPO, "package.json"), "utf8"));
const VERSION = pkg.version;
const IDENTIFIER = "com.vanillaagent.runtime";
const INSTALL_LOCATION = "/Applications/VanillaAgent";
const BUNDLE_ID = "com.vanillaagent.desktop";
const GID_WHEEL = 80;

const log = (msg) => console.log(`    ${msg}`);

// ─────────────────────────────────────────────────────────────────────────────
// cpio (odc) writer — the format macOS Installer expects inside Payload/Scripts
// ─────────────────────────────────────────────────────────────────────────────

let inode = 1;

function oct(value, width) {
  return (value >>> 0).toString(8).padStart(width, "0").slice(-width);
}

function cpioHeader({ name, mode, uid, gid, size, mtime, nlink }) {
  const fields = [
    "070707", // magic
    oct(0, 6), // dev
    oct(inode++, 6), // ino
    oct(mode, 6), // mode (includes file type bits)
    oct(uid, 6),
    oct(gid, 6),
    oct(nlink, 6),
    oct(0, 6), // rdev
    oct(mtime, 11),
    oct(Buffer.byteLength(name) + 1, 6), // namesize (NUL terminated)
    oct(size, 11),
  ];
  return Buffer.from(fields.join("") + name + "\0", "latin1");
}

/** Depth-first walk emitting parents before children, as `find .` would. */
function walkTree(root) {
  const entries = [];
  const visit = (abs, rel) => {
    const st = fs.lstatSync(abs);
    const mode = st.isDirectory()
      ? 0o040755
      : st.isSymbolicLink()
        ? 0o120777
        : (st.mode & 0o777) | 0o100000;
    const base = {
      name: rel,
      mode,
      uid: 0,
      gid: GID_WHEEL,
      size: st.isDirectory() || st.isSymbolicLink() ? 0 : st.size,
      mtime: Math.floor(st.mtimeMs / 1000),
      nlink: st.isDirectory() ? 2 : 1,
      abs,
      isDir: st.isDirectory(),
      isLink: st.isSymbolicLink(),
      linkTarget: st.isSymbolicLink() ? fs.readlinkSync(abs) : null,
    };
    entries.push(base);
    if (st.isDirectory()) {
      for (const child of fs.readdirSync(abs).sort()) {
        visit(path.join(abs, child), `${rel}/${child}`);
      }
    }
  };
  visit(root, ".");
  return entries;
}

function buildCpio(rootDir) {
  const chunks = [];
  for (const entry of walkTree(rootDir)) {
    let size = entry.size;
    let data = Buffer.alloc(0);
    if (entry.isLink) {
      data = Buffer.from(entry.linkTarget, "utf8");
      size = data.length;
    } else if (!entry.isDir) {
      data = fs.readFileSync(entry.abs);
      size = data.length;
    }
    chunks.push(cpioHeader({ ...entry, size }));
    if (data.length) chunks.push(data);
  }
  chunks.push(
    cpioHeader({
      name: "TRAILER!!!",
      mode: 0,
      uid: 0,
      gid: 0,
      size: 0,
      mtime: 0,
      nlink: 1,
    })
  );
  return Buffer.concat(chunks);
}

/** Deterministic gzip (zeroed mtime) so builds are byte-reproducible. */
function gzip(buffer) {
  const gz = zlib.gzipSync(buffer, { level: 9 });
  gz.writeUInt32LE(0, 4); // MTIME -> 0
  return gz;
}

// ─────────────────────────────────────────────────────────────────────────────
// Stage the install tree
// ─────────────────────────────────────────────────────────────────────────────

function stage() {
  const root = path.join(WORK, "root");
  fs.rmSync(WORK, { recursive: true, force: true });
  fs.mkdirSync(root, { recursive: true });

  // Payload files
  for (const entry of fs.readdirSync(PAYLOAD)) {
    fs.cpSync(path.join(PAYLOAD, entry), path.join(root, entry), {
      recursive: true,
      dereference: false,
    });
  }

  // VanillaAgent.app bundle
  const appRoot = path.join(root, "VanillaAgent.app", "Contents");
  fs.mkdirSync(path.join(appRoot, "MacOS"), { recursive: true });
  fs.mkdirSync(path.join(appRoot, "Resources"), { recursive: true });

  fs.writeFileSync(
    path.join(appRoot, "Info.plist"),
    `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key>
  <string>VanillaAgent</string>
  <key>CFBundleDisplayName</key>
  <string>VanillaAgent</string>
  <key>CFBundleIdentifier</key>
  <string>${BUNDLE_ID}</string>
  <key>CFBundleExecutable</key>
  <string>VanillaAgent</string>
  <key>CFBundleIconFile</key>
  <string>AppIcon</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>CFBundleShortVersionString</key>
  <string>${VERSION}</string>
  <key>CFBundleVersion</key>
  <string>${VERSION}</string>
  <key>CFBundleInfoDictionaryVersion</key>
  <string>6.0</string>
  <key>LSMinimumSystemVersion</key>
  <string>10.15</string>
  <key>NSHighResolutionCapable</key>
  <true/>
  <key>LSApplicationCategoryType</key>
  <string>public.app-category.developer-tools</string>
  <key>NSHumanReadableCopyright</key>
  <string>Copyright © VanillaAgent. MIT licensed.</string>
</dict>
</plist>
`
  );

  const launcher = `#!/bin/bash
# VanillaAgent.app — opens the sovereign runtime in Terminal and serves the
# Web GUI control panel at http://localhost:3000
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
NODE_BIN="$(command -v node || echo /usr/local/bin/node)"

if [ ! -x "$NODE_BIN" ]; then
  osascript -e 'display alert "VanillaAgent needs Node.js" message "Install Node.js 20 or newer from https://nodejs.org, then launch VanillaAgent again." buttons {"OK"} default button 1' >/dev/null 2>&1 || true
  exit 1
fi

osascript -e "tell application \\"Terminal\\"" \\
  -e "do script \\"clear; '$ROOT/vanilla-gui'\\"" \\
  -e "activate" \\
  >/dev/null 2>&1 || open -a Terminal "$ROOT/vanilla-gui"
exit 0
`;
  fs.writeFileSync(path.join(appRoot, "MacOS", "VanillaAgent"), launcher, { mode: 0o755 });
  fs.chmodSync(path.join(appRoot, "MacOS", "VanillaAgent"), 0o755);

  const icns = path.join(ASSETS, "vanillaagent.icns");
  if (fs.existsSync(icns)) {
    fs.copyFileSync(icns, path.join(appRoot, "Resources", "AppIcon.icns"));
  }

  // Postinstall script
  fs.mkdirSync(path.join(WORK, "scripts"), { recursive: true });
  const postinstall = `#!/bin/bash
# VanillaAgent postinstall — link CLI commands, resolve runtime dependencies.
set -u
INSTALL_ROOT="${INSTALL_LOCATION}"
BIN_DIR="/usr/local/bin"
LOG="/tmp/vanilla-agent-install.log"

echo "VanillaAgent ${VERSION} postinstall" >> "$LOG" 2>&1

# 1. Command line launchers
mkdir -p "$BIN_DIR" >> "$LOG" 2>&1
for cmd in vanilla vanilla-gui vanilla-cli; do
  if [ -e "$INSTALL_ROOT/$cmd" ]; then
    ln -sf "$INSTALL_ROOT/$cmd" "$BIN_DIR/$cmd" >> "$LOG" 2>&1
  fi
done

# 2. Runtime dependencies (best effort; the launcher retries on first run)
NODE_BIN="$(command -v node || true)"
if [ -n "$NODE_BIN" ]; then
  echo "Installing runtime dependencies with npm..." >> "$LOG" 2>&1
  ( cd "$INSTALL_ROOT" && timeout 900 "$NODE_BIN" "$(dirname "$NODE_BIN")/../lib/node_modules/npm/bin/npm-cli.js" install --omit=dev --no-audit --no-fund --loglevel=error ) >> "$LOG" 2>&1 \\
    || ( cd "$INSTALL_ROOT" && timeout 900 npm install --omit=dev --no-audit --no-fund --loglevel=error ) >> "$LOG" 2>&1 \\
    || echo "npm install failed; the launcher will retry on first launch" >> "$LOG" 2>&1
fi

# 3. Permissions + Launch Services registration
chmod -R a+rX "$INSTALL_ROOT" >> "$LOG" 2>&1
chown -R root:wheel "$INSTALL_ROOT" >> "$LOG" 2>&1
CONSOLE_USER="$(/usr/bin/stat -f%Su /dev/console 2>/dev/null || echo "")"
if [ -n "$CONSOLE_USER" ] && [ "$CONSOLE_USER" != "root" ]; then
  chown -R "$CONSOLE_USER" "$INSTALL_ROOT" >> "$LOG" 2>&1
fi

APP="$INSTALL_ROOT/VanillaAgent.app"
if [ -d "$APP" ]; then
  /usr/bin/xattr -dr com.apple.quarantine "$INSTALL_ROOT" >> "$LOG" 2>&1 || true
  LSREGISTER="/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister"
  [ -x "$LSREGISTER" ] && "$LSREGISTER" -f -R "$APP" >> "$LOG" 2>&1 || true
fi

echo "VanillaAgent ${VERSION} postinstall complete" >> "$LOG" 2>&1
exit 0
`;
  fs.writeFileSync(path.join(WORK, "scripts", "postinstall"), postinstall, { mode: 0o755 });
  fs.chmodSync(path.join(WORK, "scripts", "postinstall"), 0o755);

  return { root, scripts: path.join(WORK, "scripts") };
}

// ─────────────────────────────────────────────────────────────────────────────
// Bom
// ─────────────────────────────────────────────────────────────────────────────

function buildBom(rootDir, dest) {
  return new Promise((resolve, reject) => {
    const out = fs.createWriteStream(dest);
    out.on("finish", resolve);
    out.on("error", reject);
    mkbom(rootDir, { uid: 0, gid: GID_WHEEL }).pipe(out);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// xar
// ─────────────────────────────────────────────────────────────────────────────

function buildXar(sourceDir, outFile) {
  const names = fs.readdirSync(sourceDir).filter((n) => !n.startsWith("."));
  const archive = new xarlib.XarArchive();
  for (const name of names) {
    archive.addFile(xarutil.walk(path.join(sourceDir, name)));
  }
  archive.generate(new xario.FileWriter(outFile), (name) =>
    new xario.FileReader(path.join(sourceDir, name))
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

function dirStats(dir) {
  let files = 0;
  let bytes = 0;
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      files += 1;
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else bytes += fs.statSync(p).size;
    }
  };
  walk(dir);
  return { files, bytes };
}

async function main() {
  const archLabel = ARCH === "x64" ? "Intel (x86_64)" : "Apple Silicon (arm64)";
  console.log(`  ▸ macOS component package (${archLabel})`);

  const { root, scripts } = stage();
  const stats = dirStats(root);
  log(`staged ${stats.files} files (${(stats.bytes / 1024 / 1024).toFixed(1)} MB)`);

  const componentDir = path.join(WORK, "component");
  fs.mkdirSync(componentDir, { recursive: true });

  // Payload
  const payloadGz = gzip(buildCpio(root));
  fs.writeFileSync(path.join(componentDir, "Payload"), payloadGz);
  log(`Payload ${(payloadGz.length / 1024 / 1024).toFixed(1)} MB (cpio odc + gzip)`);

  // Scripts
  const scriptsGz = gzip(buildCpio(scripts));
  fs.writeFileSync(path.join(componentDir, "Scripts"), scriptsGz);

  // Bom
  await buildBom(root, path.join(componentDir, "Bom"));
  log("Bom written");

  // PackageInfo
  const numberOfFiles = stats.files;
  const installKBytes = Math.ceil(stats.bytes / 1024);
  const payloadHash = crypto.createHash("sha256").update(payloadGz).digest("hex");
  fs.writeFileSync(
    path.join(componentDir, "PackageInfo"),
    `<?xml version="1.0" encoding="utf-8"?>
<pkg-info format-version="2" identifier="${IDENTIFIER}" version="${VERSION}" install-location="${INSTALL_LOCATION}" auth="root" postinstall-action="none" overwrite-permissions="true" relocatable="false" hostArchitectures="${HOST_ARCH}">
  <payload numberOfFiles="${numberOfFiles}" installKBytes="${installKBytes}" />
  <bundle-version>
    <bundle id="${BUNDLE_ID}" CFBundleIdentifier="${BUNDLE_ID}" CFBundleVersion="${VERSION}" CFBundleShortVersionString="${VERSION}" path="./VanillaAgent.app" />
  </bundle-version>
  <scripts>
    <postinstall file="./postinstall" />
  </scripts>
</pkg-info>
`
  );

  const componentPkg = path.join(WORK, "vanilla-agent.pkg");
  buildXar(componentDir, componentPkg);
  log(`component package ${(fs.statSync(componentPkg).size / 1024 / 1024).toFixed(1)} MB`);

  // ── Distribution package ──────────────────────────────────────────────────
  const distDir = path.join(WORK, "dist");
  fs.mkdirSync(distDir, { recursive: true });
  fs.copyFileSync(componentPkg, path.join(distDir, "vanilla-agent.pkg"));

  for (const asset of ["background.png", "welcome.rtf", "readme.rtf", "license.rtf", "conclusion.rtf"]) {
    const src =
      asset === "background.png" ? path.join(ASSETS, "pkg-background.png") : path.join(ASSETS, asset);
    if (fs.existsSync(src)) fs.copyFileSync(src, path.join(distDir, asset));
  }

  const distribution = `<?xml version="1.0" encoding="utf-8"?>
<installer-gui-script minSpecVersion="1">
  <title>VanillaAgent ${VERSION}</title>
  <background file="background.png" mime-type="image/png" scaling="proportional" alignment="bottomleft" />
  <welcome file="welcome.rtf" mime-type="text/rtf" />
  <readme file="readme.rtf" mime-type="text/rtf" />
  <license file="license.rtf" mime-type="text/rtf" />
  <conclusion file="conclusion.rtf" mime-type="text/rtf" />
  <options customize="never" require-scripts="false" hostArchitectures="${HOST_ARCH}" />
  <domains enable_anywhere="false" enable_currentUserHome="false" enable_localSystem="true" />
  <choices-outline>
    <line choice="default" />
  </choices-outline>
  <choice id="default" title="VanillaAgent Runtime" description="The sovereign agent runtime, Web GUI control panel and creator CLI.">
    <pkg-ref id="${IDENTIFIER}" />
  </choice>
  <pkg-ref id="${IDENTIFIER}" version="${VERSION}" onConclusion="none" installKBytes="${installKBytes}">vanilla-agent.pkg</pkg-ref>
</installer-gui-script>
`;
  fs.writeFileSync(path.join(distDir, "Distribution"), distribution);

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  buildXar(distDir, OUT);
  const size = fs.statSync(OUT).size;
  console.log(
    `  ✓ ${path.relative(REPO, OUT)} (${(size / 1024 / 1024).toFixed(1)} MB, payload sha256 ${payloadHash.slice(0, 12)}…)`
  );
}

main().catch((err) => {
  console.error(`  ✗ macOS package build failed: ${err.message}`);
  process.exit(1);
});
