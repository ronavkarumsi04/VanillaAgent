#!/usr/bin/env node
/**
 * VanillaAgent Installer Manifest
 * ───────────────────────────────
 * Scans the release directory, classifies every artifact (native installer,
 * package, portable archive) and writes installers-manifest.json — the single
 * source of truth for the checksums file and the themed download page.
 *
 * Usage: node make-manifest.mjs --version 0.2.1 --dir releases
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const argv = process.argv.slice(2);
const opt = (flag, fallback) => {
  const i = argv.indexOf(flag);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};

const REPO = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..", "..");
const VERSION = opt("--version", JSON.parse(fs.readFileSync(path.join(REPO, "package.json"), "utf8")).version);
const DIR = path.resolve(opt("--dir", "releases"));
const OUT = path.resolve(opt("--out", path.join(DIR, "installers-manifest.json")));

/** name -> { os, arch, kind, label, howto } */
const RULES = [
  {
    test: /-macOS-AppleSilicon\.pkg$/,
    meta: {
      os: "macos",
      arch: "arm64",
      kind: "pkg",
      label: "macOS · Apple Silicon (M1/M2/M3/M4)",
      howto: [
        "Open the downloaded .pkg file.",
        "Follow the installer (it installs to /Applications/VanillaAgent).",
        "If macOS says the package is from an unidentified developer, right-click it and choose Open.",
        'Launch "VanillaAgent" from Applications, or run: vanilla-gui',
      ],
      primary: true,
    },
  },
  {
    test: /-macOS-Intel\.pkg$/,
    meta: {
      os: "macos",
      arch: "x64",
      kind: "pkg",
      label: "macOS · Intel",
      howto: [
        "Open the downloaded .pkg file.",
        "Follow the installer (it installs to /Applications/VanillaAgent).",
        'Launch "VanillaAgent" from Applications, or run: vanilla-gui',
      ],
      primary: true,
    },
  },
  {
    test: /-Windows-x64-Setup\.exe$/,
    meta: {
      os: "windows",
      arch: "x64",
      kind: "exe",
      label: "Windows · 64-bit installer",
      howto: [
        "Run the downloaded Setup executable.",
        "Accept the license, pick a location and let it install the runtime dependencies.",
        "Tick “Launch VanillaAgent” on the last page — the dashboard opens at http://localhost:3000.",
      ],
      primary: true,
    },
  },
  {
    test: /_amd64\.deb$/,
    meta: {
      os: "linux",
      arch: "x64",
      kind: "deb",
      label: "Debian / Ubuntu · x86_64",
      howto: [
        "sudo apt install ./vanilla-agent-VERSION.deb",
        "vanilla-gui   # starts the runtime + dashboard on http://localhost:3000",
        "systemctl --user enable --now vanilla-agent.service   # optional background service",
      ],
      primary: true,
    },
  },
  {
    test: /_arm64\.deb$/,
    meta: {
      os: "linux",
      arch: "arm64",
      kind: "deb",
      label: "Debian / Ubuntu · ARM64",
      howto: [
        "sudo apt install ./vanilla-agent-VERSION.deb",
        "vanilla-gui   # starts the runtime + dashboard on http://localhost:3000",
      ],
    },
  },
  {
    test: /-1\.x86_64\.rpm$/,
    meta: {
      os: "linux",
      arch: "x64",
      kind: "rpm",
      label: "Fedora / RHEL / openSUSE · x86_64",
      howto: [
        "sudo dnf install ./vanilla-agent-VERSION.rpm      # or: sudo zypper install ./…rpm",
        "vanilla-gui   # starts the runtime + dashboard on http://localhost:3000",
      ],
      primary: true,
    },
  },
  {
    test: /-1\.aarch64\.rpm$/,
    meta: {
      os: "linux",
      arch: "arm64",
      kind: "rpm",
      label: "Fedora / RHEL / openSUSE · aarch64",
      howto: ["sudo dnf install ./vanilla-agent-VERSION.rpm", "vanilla-gui"],
    },
  },
  {
    test: /-unix-installer\.sh$/,
    meta: {
      os: "unix",
      arch: "any",
      kind: "sh",
      label: "Universal installer · macOS + Linux",
      howto: [
        "chmod +x VanillaAgent-VERSION-unix-installer.sh",
        "./VanillaAgent-VERSION-unix-installer.sh",
        "# non-interactive:  ./VanillaAgent-VERSION-unix-installer.sh --yes --prefix ~/vanilla-agent",
      ],
      primary: true,
    },
  },
  // Portable archives produced by scripts/build-releases.sh
  {
    test: /-macos-arm64\.tar\.gz$/,
    meta: { os: "macos", arch: "arm64", kind: "tar.gz", label: "macOS · portable archive (arm64)", portable: true },
  },
  {
    test: /-macos-x64\.tar\.gz$/,
    meta: { os: "macos", arch: "x64", kind: "tar.gz", label: "macOS · portable archive (Intel)", portable: true },
  },
  {
    test: /-windows-x64\.zip$/,
    meta: { os: "windows", arch: "x64", kind: "zip", label: "Windows · portable archive", portable: true },
  },
  {
    test: /-linux-x64\.tar\.gz$/,
    meta: { os: "linux", arch: "x64", kind: "tar.gz", label: "Linux · portable archive (x86_64)", portable: true },
  },
  {
    test: /-linux-arm64\.tar\.gz$/,
    meta: { os: "linux", arch: "arm64", kind: "tar.gz", label: "Linux · portable archive (ARM64)", portable: true },
  },
];

const ORDER = { macos: 0, windows: 1, linux: 2, unix: 3 };
const ARCH_ORDER = { arm64: 0, x64: 1, any: 2 };

function human(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function main() {
  if (!fs.existsSync(DIR)) {
    console.error(`  ✗ release directory missing: ${DIR}`);
    process.exit(1);
  }

  const files = fs
    .readdirSync(DIR)
    .filter((name) => !name.startsWith("."))
    .filter((name) => {
      const p = path.join(DIR, name);
      return fs.statSync(p).isFile();
    })
    .filter((name) => !["SHA256SUMS.txt", "installers-manifest.json", "index.html", "release-manifest.json"].includes(name));

  const artifacts = [];
  for (const name of files) {
    const rule = RULES.find((r) => r.test.test(name));
    if (!rule) continue;
    const p = path.join(DIR, name);
    const size = fs.statSync(p).size;
    const sha256 = crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
    artifacts.push({
      file: name,
      ...rule.meta,
      size,
      sizeLabel: human(size),
      sha256,
      howto: (rule.meta.howto || []).map((line) => line.replace(/VERSION/g, VERSION)),
    });
  }

  artifacts.sort(
    (a, b) =>
      (ORDER[a.os] ?? 9) - (ORDER[b.os] ?? 9) ||
      (ARCH_ORDER[a.arch] ?? 9) - (ARCH_ORDER[b.arch] ?? 9) ||
      a.kind.localeCompare(b.kind)
  );

  const manifest = {
    name: "VanillaAgent",
    version: VERSION,
    generatedAt: new Date().toISOString(),
    repository: "https://github.com/ronavkarumsi04/VanillaAgent",
    requirements: {
      node: ">=20.0.0",
      memory: "2 GB RAM minimum",
      disk: "3 MB runtime + ~180 MB for dependencies on first launch",
      network: "Required once, to fetch runtime dependencies (or run fully local with Ollama)",
    },
    artifacts,
  };

  fs.writeFileSync(OUT, JSON.stringify(manifest, null, 2) + "\n");
  console.log(`  ✓ ${path.relative(REPO, OUT)} (${artifacts.length} artifacts)`);
}

main();
