#!/usr/bin/env node
/**
 * VanillaAgent Payload Stager
 * ───────────────────────────
 * Assembles the platform-independent install tree that every native installer
 * (macOS .pkg, Windows .exe, .deb, .rpm, universal shell installer) ships:
 *
 *   <payload>/
 *     package.json          runtime root (private) - declares file: deps
 *     app/                  @vanilla-agent/core  (dist + manifest)
 *     cli/                  @vanilla-agent/cli   (dist + manifest)
 *     skills/               bundled autonomous skills
 *     docs/                 README, LICENSE, constitution
 *     assets/               brand icons
 *     lib/                  bootstrap.mjs, open-browser.mjs, uninstallers
 *     vanilla, vanilla-gui, vanilla-cli   (+ .cmd twins)
 *     install-manifest.json installer metadata (version, layout, checksums)
 *
 * Usage: node stage-payload.mjs [--out build/payload] [--assets build/brand]
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "..", "..");
const TEMPLATES = path.join(HERE, "templates", "runtime");

const args = process.argv.slice(2);
const argOf = (flag, fallback) => {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const OUT = path.resolve(argOf("--out", "build/payload"));
const ASSETS = path.resolve(argOf("--assets", "build/brand"));

const rootPkg = JSON.parse(fs.readFileSync(path.join(REPO, "package.json"), "utf8"));
const cliPkg = JSON.parse(fs.readFileSync(path.join(REPO, "packages/cli/package.json"), "utf8"));
const VERSION = rootPkg.version;

const log = (msg) => console.log(`  ▸ ${msg}`);

// ── Helpers ─────────────────────────────────────────────────────────────────
function rmrf(target) {
  fs.rmSync(target, { recursive: true, force: true });
}

/** Entries that must never be shipped inside an installer payload. */
const EXCLUDED = new Set(["node_modules", ".DS_Store", ".git", "coverage", "*.log"]);

function copyDir(from, to, filter) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    if (EXCLUDED.has(entry.name)) continue;
    const src = path.join(from, entry.name);
    const dst = path.join(to, entry.name);
    if (filter && !filter(entry.name, src)) continue;
    if (entry.isDirectory()) copyDir(src, dst, filter);
    else fs.copyFileSync(src, dst);
  }
}

/** Copy a template, substituting @@TOKEN@@ placeholders. */
function template(from, to, mode) {
  const raw = fs.readFileSync(from, "utf8").replace(/@@VERSION@@/g, VERSION);
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.writeFileSync(to, raw, mode ? { mode } : undefined);
  if (mode) fs.chmodSync(to, mode);
}

function sha256File(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

// ── 1. Clean + scaffold ─────────────────────────────────────────────────────
rmrf(OUT);
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(path.join(OUT, "app"), { recursive: true });
fs.mkdirSync(path.join(OUT, "cli"), { recursive: true });
fs.mkdirSync(path.join(OUT, "lib"), { recursive: true });
fs.mkdirSync(path.join(OUT, "docs"), { recursive: true });
fs.mkdirSync(path.join(OUT, "tools"), { recursive: true });
fs.mkdirSync(path.join(OUT, "assets"), { recursive: true });

// ── 2. Compiled runtime ─────────────────────────────────────────────────────
const distDir = path.join(REPO, "dist");
if (!fs.existsSync(distDir)) {
  console.error("  ✗ dist/ missing - run `pnpm build` before staging a payload.");
  process.exit(1);
}
log("copying compiled core runtime");
copyDir(distDir, path.join(OUT, "app", "dist"));
log("copying compiled CLI");
copyDir(path.join(REPO, "packages", "cli", "dist"), path.join(OUT, "cli", "dist"));

// ── 3. Package manifests ────────────────────────────────────────────────────
log("writing runtime manifests");

const coreManifest = {
  name: rootPkg.name,
  version: rootPkg.version,
  description: rootPkg.description,
  type: rootPkg.type,
  main: rootPkg.main,
  types: rootPkg.types,
  exports: rootPkg.exports,
  bin: rootPkg.bin,
  repository: rootPkg.repository,
  homepage: rootPkg.homepage,
  keywords: rootPkg.keywords,
  license: rootPkg.license,
  engines: rootPkg.engines,
  dependencies: rootPkg.dependencies,
};
fs.writeFileSync(
  path.join(OUT, "app", "package.json"),
  JSON.stringify(coreManifest, null, 2) + "\n"
);

const cliManifest = {
  name: cliPkg.name,
  version: cliPkg.version,
  description: cliPkg.description,
  type: cliPkg.type,
  main: cliPkg.main,
  types: cliPkg.types,
  bin: cliPkg.bin,
  engines: rootPkg.engines,
  dependencies: {
    "@vanilla-agent/core": "file:../app",
    ...Object.fromEntries(
      Object.entries(cliPkg.dependencies || {}).filter(([k]) => k !== "@vanilla-agent/core")
    ),
  },
};
fs.writeFileSync(path.join(OUT, "cli", "package.json"), JSON.stringify(cliManifest, null, 2) + "\n");

const runtimeManifest = {
  name: "@vanilla-agent/runtime",
  version: VERSION,
  private: true,
  description: "VanillaAgent installed runtime — sovereign agent, Web GUI and creator CLI",
  type: "module",
  engines: rootPkg.engines,
  dependencies: {
    "@vanilla-agent/core": "file:./app",
    "@vanilla-agent/cli": "file:./cli",
  },
  scripts: {
    start: "node lib/bootstrap.mjs core --run",
    gui: "node lib/bootstrap.mjs core --run",
    cli: "node lib/bootstrap.mjs cli",
  },
};
fs.writeFileSync(path.join(OUT, "package.json"), JSON.stringify(runtimeManifest, null, 2) + "\n");

// Ship the pnpm lockfile when present so installs are reproducible.
const lockfile = path.join(REPO, "pnpm-lock.yaml");
if (fs.existsSync(lockfile)) fs.copyFileSync(lockfile, path.join(OUT, "pnpm-lock.yaml"));

// ── 4. Skills, docs, assets ─────────────────────────────────────────────────
const skillsDir = path.join(REPO, "src", "skills", "built-in");
if (fs.existsSync(skillsDir)) {
  log("copying bundled skills");
  copyDir(skillsDir, path.join(OUT, "skills"));
}

for (const doc of ["README.md", "LICENSE", "constitution.md"]) {
  const src = path.join(REPO, doc);
  if (fs.existsSync(src)) fs.copyFileSync(src, path.join(OUT, "docs", doc));
}

if (fs.existsSync(ASSETS)) {
  log("copying brand assets");
  for (const asset of ["logo-512.png", "vanillaagent.icns", "vanillaagent.ico", "logo-1024.png"]) {
    const src = path.join(ASSETS, asset);
    if (fs.existsSync(src)) fs.copyFileSync(src, path.join(OUT, "assets", asset));
  }
}

log("copying desktop + service templates");
for (const name of ["vanilla-agent.desktop", "vanilla-agent.service"]) {
  fs.copyFileSync(path.join(HERE, "templates", "linux", name), path.join(OUT, "tools", name));
}

// ── 5. Launchers + support library ──────────────────────────────────────────
log("installing launchers");
for (const [src, dest, mode] of [
  ["lib/bootstrap.mjs", "lib/bootstrap.mjs", undefined],
  ["lib/open-browser.mjs", "lib/open-browser.mjs", undefined],
  ["vanilla", "vanilla", 0o755],
  ["vanilla-gui", "vanilla-gui", 0o755],
  ["vanilla-cli", "vanilla-cli", 0o755],
]) {
  template(path.join(TEMPLATES, src), path.join(OUT, dest), mode);
}

// Windows twins (CRLF so Notepad/cmd behave)
for (const name of ["vanilla.cmd", "vanilla-gui.cmd", "vanilla-cli.cmd"]) {
  const raw = fs.readFileSync(path.join(TEMPLATES, name), "utf8").replace(/@@VERSION@@/g, VERSION);
  fs.writeFileSync(path.join(OUT, name), raw.replace(/\n/g, "\r\n"));
}

// Uninstallers for manual / portable installs
template(path.join(TEMPLATES, "lib", "uninstall.sh"), path.join(OUT, "lib", "uninstall.sh"), 0o755);
{
  const raw = fs
    .readFileSync(path.join(TEMPLATES, "lib", "uninstall.cmd"), "utf8")
    .replace(/@@VERSION@@/g, VERSION);
  fs.writeFileSync(path.join(OUT, "lib", "uninstall.cmd"), raw.replace(/\n/g, "\r\n"));
}

// ── 6. Install manifest ─────────────────────────────────────────────────────
const manifest = {
  name: "VanillaAgent",
  version: VERSION,
  installId: "com.vanillaagent.runtime",
  layout: {
    root: ".",
    core: "app",
    cli: "cli",
    skills: "skills",
    docs: "docs",
    lib: "lib",
  },
  launchers: ["vanilla", "vanilla-gui", "vanilla-cli"],
  gui: {
    defaultPort: 3000,
    routes: ["/", "/gui", "/health", "/ready", "/metrics", "/status"],
  },
  requires: { node: rootPkg.engines?.node || ">=20.0.0" },
  builtAt: new Date().toISOString(),
  files: {
    "app/dist/index.js": sha256File(path.join(OUT, "app", "dist", "index.js")),
    "cli/dist/index.js": sha256File(path.join(OUT, "cli", "dist", "index.js")),
  },
};
fs.writeFileSync(
  path.join(OUT, "install-manifest.json"),
  JSON.stringify(manifest, null, 2) + "\n"
);

const bytes = (() => {
  let total = 0;
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else total += fs.statSync(p).size;
    }
  };
  walk(OUT);
  return total;
})();

console.log(`  ✓ payload staged -> ${path.relative(REPO, OUT)} (${(bytes / 1024 / 1024).toFixed(1)} MB)`);
