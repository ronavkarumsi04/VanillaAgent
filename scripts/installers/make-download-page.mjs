#!/usr/bin/env node
/**
 * VanillaAgent Download Page Generator
 * ────────────────────────────────────
 * Renders a self-contained, brand-accurate download page from
 * installers-manifest.json. Fonts, logo and favicon are embedded as data URIs,
 * so the page renders identically offline and when served from `releases/`.
 *
 * Usage: node make-download-page.mjs --manifest releases/installers-manifest.json
 */

import fs from "node:fs";
import path from "node:path";

const argv = process.argv.slice(2);
const opt = (flag, fallback) => {
  const i = argv.indexOf(flag);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};

const HERE = path.dirname(new URL(import.meta.url).pathname);
const REPO = path.resolve(HERE, "..", "..");
const MANIFEST = path.resolve(opt("--manifest", "releases/installers-manifest.json"));
const ASSETS = path.resolve(opt("--assets", "build/brand"));
const OUT = path.resolve(opt("--out", "releases/index.html"));

const manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
const VERSION = manifest.version;

// ── Embedded assets ─────────────────────────────────────────────────────────
const FONT_FILES = [
  ["PlusJakartaSans", "plus-jakarta-sans-latin-400-normal.woff", "font/woff", 400],
  ["PlusJakartaSans", "plus-jakarta-sans-latin-700-normal.woff", "font/woff", 700],
  ["PlusJakartaSans", "plus-jakarta-sans-latin-800-normal.woff", "font/woff", 800],
  ["JetBrainsMono", "jetbrains-mono-latin-400-normal.woff", "font/woff", 400],
  ["JetBrainsMono", "jetbrains-mono-latin-700-normal.woff", "font/woff", 700],
];

const fontCss = FONT_FILES.map(([family, file, mime, weight]) => {
  const inline = `data:${mime};base64,${fs.readFileSync(path.join(REPO, "brand", "fonts", file)).toString("base64")}`;
  return `@font-face{font-family:'${family}';font-style:normal;font-weight:${weight};font-display:swap;src:url('${inline}') format('woff');}`;
}).join("\n  ");

const logoUri = `data:image/png;base64,${fs.readFileSync(path.join(ASSETS, "logo-512.png")).toString("base64")}`;
const faviconUri = `data:image/x-icon;base64,${fs.readFileSync(path.join(ASSETS, "favicon.ico")).toString("base64")}`;

// ── Icons ───────────────────────────────────────────────────────────────────
const ICONS = {
  macos: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16.36 12.68c-.02-2.22 1.81-3.29 1.89-3.34-1.03-1.5-2.62-1.71-3.18-1.73-1.35-.14-2.64.79-3.33.79-.69 0-1.75-.77-2.87-.75-1.48.02-2.84.86-3.6 2.18-1.54 2.67-.39 6.62 1.1 8.78.73 1.06 1.6 2.25 2.74 2.21 1.1-.04 1.51-.71 2.84-.71 1.32 0 1.7.71 2.86.69 1.18-.02 1.93-1.08 2.65-2.14.84-1.23 1.19-2.42 1.21-2.48-.03-.01-2.31-.89-2.33-3.5zM14.2 5.83c.61-.74 1.02-1.77.91-2.79-.88.04-1.94.59-2.57 1.32-.56.65-1.05 1.7-.92 2.7.98.08 1.98-.5 2.58-1.23z"/></svg>`,
  windows: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 5.4l7.6-1v7.1H3V5.4zm8.7-1.2L21 3v8.3h-9.3V4.2zM3 12.5h7.6v7.1L3 18.6v-6.1zm8.7 0H21v8.3l-9.3-1.3v-7z"/></svg>`,
  linux: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2c-2.6 0-4.3 2-4.3 4.6 0 1.6.5 2.6.5 4 0 1-.7 1.5-.7 2.2 0 .9 1.6 1.2 2.4 1.9.7.6 1 1.4 2.1 1.4s1.4-.8 2.1-1.4c.8-.7 2.4-1 2.4-1.9 0-.7-.7-1.2-.7-2.2 0-1.4.5-2.4.5-4C16.3 4 14.6 2 12 2zm-1.2 3.1c.4 0 .7.3.7.7s-.3.7-.7.7-.7-.3-.7-.7.3-.7.7-.7zm2.4 0c.4 0 .7.3.7.7s-.3.7-.7.7-.7-.3-.7-.7.3-.7.7-.7zM12 7.4c.7 0 1.6.5 1.6.9 0 .4-.9.9-1.6.9s-1.6-.5-1.6-.9c0-.4.9-.9 1.6-.9zM8.4 8.6c.8.3.9 1.6.5 2.7-.3.8-.9 1.3-1.6 1.3s-1.2-.5-1.5-1.5c-.2-.7-.1-1.5.3-2 .3-.5.9-.8 1.6-.8.2 0 .5 0 .7.3zm7.2 0c.2-.3.5-.3.7-.3.7 0 1.3.3 1.6.8.4.5.5 1.3.3 2-.3 1-.8 1.5-1.5 1.5s-1.3-.5-1.6-1.3c-.4-1.1-.3-2.4.5-2.7zM12 13.6c1.6 0 4.4 1.6 4.4 3.2 0 1-1.4 1.6-3 1.9-1.6.3-3.2.3-4.8 0-1.6-.3-3-.9-3-1.9 0-1.6 2.8-3.2 4.4-3.2z"/></svg>`,
  unix: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>`,
};

const KIND_LABEL = {
  pkg: "Installer package",
  exe: "Setup wizard",
  deb: "Debian package",
  rpm: "RPM package",
  sh: "Self-extracting script",
  zip: "Portable archive",
  "tar.gz": "Portable archive",
};

const esc = (value) =>
  String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// ── Cards ───────────────────────────────────────────────────────────────────
function card(artifact, index) {
  const icon = ICONS[artifact.os] || ICONS.unix;
  const recommended =
    artifact.os === "unix"
      ? "Works everywhere — macOS, Linux, WSL, Raspberry Pi"
      : artifact.arch === "arm64" && artifact.os === "macos"
        ? "Apple M-series chips"
        : artifact.arch === "x64" && artifact.os === "macos"
          ? "Older Intel Macs"
          : artifact.kind === "deb"
            ? "Debian, Ubuntu, Pop!_OS, Mint"
            : artifact.kind === "rpm"
              ? "Fedora, RHEL, Rocky, openSUSE"
              : "Windows 10 and 11";

  const steps = artifact.howto?.length
    ? artifact.howto
        .map(
          (line) =>
            `          <li><code>${esc(line)}</code></li>`
        )
        .join("\n")
    : `          <li><code>Download and extract, then run <strong>vanilla-gui</strong></code></li>`;

  return `
      <article class="card" data-os="${artifact.os}" data-arch="${artifact.arch}" data-kind="${artifact.kind}" style="--delay:${index * 60}ms">
        <div class="card-head">
          <span class="card-icon">${icon}</span>
          <div class="card-title">
            <h3>${esc(artifact.label)}</h3>
            <p>${esc(recommended)}</p>
          </div>
          <span class="badge">${esc(KIND_LABEL[artifact.kind] || artifact.kind)}</span>
        </div>
        <dl class="card-meta">
          <div><dt>File</dt><dd class="mono">${esc(artifact.file)}</dd></div>
          <div><dt>Size</dt><dd class="mono">${esc(artifact.sizeLabel)}</dd></div>
        </dl>
        <a class="btn btn-primary block" href="${esc(artifact.file)}" download>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Download
        </a>
        <details>
          <summary>Install instructions</summary>
          <ol class="steps">
${steps}
          </ol>
        </details>
        <div class="checksum">
          <span class="mono">sha256:${artifact.sha256.slice(0, 24)}…</span>
          <button class="btn-ghost" data-copy="${artifact.sha256}" title="Copy the full SHA-256">copy</button>
        </div>
      </article>`;
}

// ── Page ────────────────────────────────────────────────────────────────────
const cards = manifest.artifacts.map(card).join("\n");

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Download VanillaAgent ${esc(VERSION)} — Sovereign AI Agent Runtime</title>
<meta name="description" content="Download VanillaAgent ${esc(VERSION)} for macOS (Apple Silicon and Intel), Windows and Linux. A sovereign autonomous AI agent runtime with its own wallet, five-tier memory and a Web GUI control panel.">
<meta name="theme-color" content="#060708">
<link rel="icon" href="${faviconUri}">
<meta property="og:title" content="VanillaAgent ${esc(VERSION)}">
<meta property="og:description" content="${esc(manifest.tagline || "Sovereign Autonomous AI Agent Runtime & Swarm Engine")}">
<style>
  ${fontCss}
  :root {
    --brand-50:#f0fdfa; --brand-400:#2dd4bf; --brand-500:#14b8a6; --brand-600:#0d9488; --brand-900:#134e4a;
    --dark-800:#181b20; --dark-850:#121418; --dark-900:#0c0d10; --dark-950:#060708;
    --slate-200:#e2e8f0; --slate-300:#cbd5e1; --slate-400:#94a3b8; --slate-500:#64748b;
    --radius:16px;
  }
  * { box-sizing:border-box; }
  html { scroll-behavior:smooth; }
  body {
    margin:0; background:var(--dark-950); color:var(--slate-200);
    font-family:'PlusJakartaSans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    -webkit-font-smoothing:antialiased; line-height:1.6; overflow-x:hidden;
  }
  code, pre, .mono { font-family:'JetBrainsMono', ui-monospace, SFMono-Regular, Menlo, monospace; }
  a { color:var(--brand-400); text-decoration:none; }
  a:hover { color:var(--brand-500); }

  .bg { position:fixed; inset:0; z-index:-1; pointer-events:none; }
  .bg::before {
    content:""; position:absolute; inset:-20%;
    background:
      radial-gradient(48rem 32rem at 78% -8%, rgba(20,184,166,.20), transparent 65%),
      radial-gradient(40rem 28rem at 6% 8%, rgba(19,78,74,.35), transparent 60%),
      radial-gradient(30rem 30rem at 50% 120%, rgba(45,212,191,.10), transparent 60%);
  }
  .bg::after {
    content:""; position:absolute; inset:0; opacity:.5;
    background-image:linear-gradient(rgba(255,255,255,.025) 1px, transparent 1px),
                     linear-gradient(90deg, rgba(255,255,255,.025) 1px, transparent 1px);
    background-size:46px 46px;
    mask-image:radial-gradient(70% 60% at 50% 0%, #000 40%, transparent 100%);
    -webkit-mask-image:radial-gradient(70% 60% at 50% 0%, #000 40%, transparent 100%);
  }

  header {
    position:sticky; top:0; z-index:20;
    display:flex; align-items:center; gap:16px; justify-content:space-between;
    padding:14px clamp(16px, 4vw, 48px);
    background:rgba(12,13,16,.78); backdrop-filter:blur(14px);
    border-bottom:1px solid rgba(255,255,255,.06);
  }
  .brand { display:flex; align-items:center; gap:12px; }
  .brand img { width:34px; height:34px; border-radius:10px; box-shadow:0 8px 24px rgba(20,184,166,.28); }
  .brand b { font-size:1.02rem; font-weight:800; letter-spacing:-.01em; color:#fff; }
  .pill {
    font-family:'JetBrainsMono', monospace; font-size:.68rem; letter-spacing:.08em; text-transform:uppercase;
    padding:3px 9px; border-radius:999px; color:var(--brand-400);
    background:rgba(20,184,166,.12); border:1px solid rgba(45,212,191,.25);
  }
  nav.links { display:flex; gap:18px; font-size:.9rem; color:var(--slate-400); }
  nav.links a { color:var(--slate-400); } nav.links a:hover { color:#fff; }

  main { max-width:1120px; margin:0 auto; padding:clamp(32px, 6vw, 72px) clamp(16px, 4vw, 48px) 96px; }

  .hero { text-align:center; margin-bottom:56px; animation:rise .7s cubic-bezier(.2,.8,.2,1) both; }
  .hero h1 {
    margin:18px 0 14px; font-size:clamp(2.1rem, 5.4vw, 3.6rem); line-height:1.08;
    font-weight:800; letter-spacing:-.03em; color:#fff;
  }
  .hero h1 span { background:linear-gradient(100deg, var(--brand-400), #7dd3fc); -webkit-background-clip:text; background-clip:text; color:transparent; }
  .hero p.lede { max-width:640px; margin:0 auto 26px; color:var(--slate-400); font-size:1.05rem; }
  .cta { display:flex; flex-wrap:wrap; gap:12px; justify-content:center; }
  .detected { margin-top:16px; font-size:.85rem; color:var(--slate-500); font-family:'JetBrainsMono', monospace; }
  .detected b { color:var(--brand-400); font-weight:700; }
  .chips { display:flex; flex-wrap:wrap; gap:8px; justify-content:center; margin-top:22px; padding:0; list-style:none; }
  .chips li {
    font-family:'JetBrainsMono', monospace; font-size:.72rem; color:var(--slate-400);
    padding:5px 11px; border-radius:999px; border:1px solid rgba(255,255,255,.08); background:rgba(255,255,255,.03);
  }

  .btn {
    display:inline-flex; align-items:center; justify-content:center; gap:9px;
    font-weight:700; font-size:.94rem; padding:12px 20px; border-radius:12px; cursor:pointer;
    border:1px solid transparent; transition:transform .16s ease, box-shadow .16s ease, background .16s ease;
  }
  .btn svg { width:17px; height:17px; }
  .btn-primary { color:#04120f; background:linear-gradient(135deg, var(--brand-400), var(--brand-600)); box-shadow:0 10px 28px rgba(20,184,166,.26); }
  .btn-primary:hover { transform:translateY(-2px); box-shadow:0 14px 34px rgba(20,184,166,.34); color:#04120f; }
  .btn-ghost { color:var(--slate-300); border:1px solid rgba(255,255,255,.14); background:rgba(255,255,255,.03); }
  .btn-ghost:hover { color:#fff; border-color:rgba(45,212,191,.5); background:rgba(45,212,191,.08); }
  .block { display:flex; width:100%; }

  .section-title { display:flex; align-items:baseline; gap:12px; margin:0 0 18px; }
  .section-title h2 { margin:0; font-size:1.28rem; font-weight:800; color:#fff; letter-spacing:-.01em; }
  .section-title span { font-family:'JetBrainsMono', monospace; font-size:.74rem; color:var(--slate-500); }

  .grid { display:grid; gap:16px; grid-template-columns:repeat(auto-fill, minmax(320px, 1fr)); }
  .card {
    position:relative; padding:20px; border-radius:var(--radius);
    background:linear-gradient(180deg, rgba(24,27,32,.86), rgba(18,20,24,.72));
    border:1px solid rgba(255,255,255,.07); backdrop-filter:blur(10px);
    animation:rise .6s cubic-bezier(.2,.8,.2,1) both; animation-delay:var(--delay);
    transition:transform .18s ease, border-color .18s ease, box-shadow .18s ease;
  }
  .card:hover { transform:translateY(-3px); border-color:rgba(45,212,191,.34); box-shadow:0 18px 44px rgba(0,0,0,.42); }
  .card.recommended { border-color:rgba(45,212,191,.55); box-shadow:0 0 0 1px rgba(45,212,191,.18), 0 18px 44px rgba(0,0,0,.42); }
  .card.recommended::after {
    content:"recommended for you"; position:absolute; top:-10px; right:16px;
    font-family:'JetBrainsMono', monospace; font-size:.62rem; letter-spacing:.1em; text-transform:uppercase;
    padding:3px 9px; border-radius:999px; color:#04120f; background:var(--brand-400); font-weight:700;
  }
  .card-head { display:flex; gap:13px; align-items:flex-start; margin-bottom:16px; }
  .card-icon { flex:0 0 auto; width:38px; height:38px; display:grid; place-items:center; border-radius:11px; color:var(--brand-400); background:rgba(20,184,166,.10); border:1px solid rgba(45,212,191,.22); }
  .card-icon svg { width:20px; height:20px; }
  .card-title h3 { margin:0; font-size:1rem; font-weight:700; color:#fff; }
  .card-title p { margin:2px 0 0; font-size:.82rem; color:var(--slate-500); }
  .badge {
    margin-left:auto; flex:0 0 auto; font-family:'JetBrainsMono', monospace; font-size:.62rem;
    letter-spacing:.06em; text-transform:uppercase; color:var(--slate-400);
    padding:4px 8px; border-radius:7px; border:1px solid rgba(255,255,255,.08); background:rgba(255,255,255,.03);
  }
  .card-meta { margin:0 0 16px; display:grid; gap:6px; }
  .card-meta > div { display:flex; gap:10px; align-items:baseline; font-size:.78rem; }
  .card-meta dt { color:var(--slate-500); min-width:38px; margin:0; }
  .card-meta dd { margin:0; color:var(--slate-300); overflow-wrap:anywhere; }
  details { margin-top:14px; }
  details summary { cursor:pointer; font-size:.82rem; color:var(--slate-400); list-style:none; display:flex; align-items:center; gap:6px; }
  details summary::-webkit-details-marker { display:none; }
  details summary::before { content:"▸"; color:var(--brand-400); transition:transform .15s ease; display:inline-block; }
  details[open] summary::before { transform:rotate(90deg); }
  details summary:hover { color:#fff; }
  .steps { margin:10px 0 0; padding-left:18px; display:grid; gap:7px; }
  .steps li { font-size:.82rem; color:var(--slate-300); }
  .steps code { font-size:.78rem; color:var(--brand-400); background:rgba(20,184,166,.08); padding:2px 6px; border-radius:6px; overflow-wrap:anywhere; }
  .checksum {
    display:flex; align-items:center; justify-content:space-between; gap:10px; margin-top:16px;
    padding-top:12px; border-top:1px solid rgba(255,255,255,.06);
  }
  .checksum .mono { font-size:.7rem; color:var(--slate-500); overflow-wrap:anywhere; }
  .btn-ghost { font-family:'JetBrainsMono', monospace; font-size:.7rem; padding:5px 10px; border-radius:8px; cursor:pointer; }

  .panel {
    margin-top:44px; padding:22px; border-radius:var(--radius);
    background:rgba(18,20,24,.6); border:1px solid rgba(255,255,255,.07);
  }
  .panel h3 { margin:0 0 12px; font-size:1rem; color:#fff; }
  pre {
    margin:0 0 12px; padding:14px 16px; border-radius:12px; overflow-x:auto;
    background:var(--dark-950); border:1px solid rgba(255,255,255,.07);
    font-size:.8rem; color:var(--slate-300);
  }
  pre .c { color:var(--brand-400); }
  table { width:100%; border-collapse:collapse; font-size:.86rem; }
  th, td { text-align:left; padding:9px 10px; border-bottom:1px solid rgba(255,255,255,.06); }
  th { color:var(--slate-500); font-weight:600; font-size:.76rem; text-transform:uppercase; letter-spacing:.06em; }
  td { color:var(--slate-300); }

  footer {
    border-top:1px solid rgba(255,255,255,.06); padding:28px clamp(16px, 4vw, 48px);
    display:flex; flex-wrap:wrap; gap:12px; align-items:center; justify-content:space-between;
    color:var(--slate-500); font-size:.84rem;
  }
  footer .mono { font-size:.74rem; }

  @keyframes rise { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:none; } }
  @media (prefers-reduced-motion: reduce) { * { animation:none !important; transition:none !important; } }
  @media (max-width: 640px) { nav.links { display:none; } }
</style>
</head>
<body>
<div class="bg" aria-hidden="true"></div>

<header>
  <div class="brand">
    <img src="${logoUri}" alt="VanillaAgent logo">
    <b>VanillaAgent</b>
    <span class="pill">Sovereign Node v${esc(VERSION)}</span>
  </div>
  <nav class="links">
    <a href="#downloads">Downloads</a>
    <a href="#verify">Verify</a>
    <a href="#requirements">Requirements</a>
    <a href="${esc(manifest.repository)}" rel="noopener">GitHub</a>
  </nav>
</header>

<main>
  <section class="hero">
    <span class="pill">v${esc(VERSION)} · cross-platform installers</span>
    <h1>Your sovereign AI agent,<br><span>installed in one click.</span></h1>
    <p class="lede">
      VanillaAgent holds its own wallet, pays for its own compute, keeps a five-tier cognitive
      memory and coordinates swarms of sub-agents — all controlled from a Web GUI at
      <code>localhost:3000</code>.
    </p>
    <div class="cta">
      <a class="btn btn-primary" id="hero-download" href="#downloads">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        <span id="hero-download-label">Download for your platform</span>
      </a>
      <a class="btn btn-ghost" href="${esc(manifest.repository)}/releases" rel="noopener">View source &amp; releases</a>
    </div>
    <p class="detected" id="detected">Detecting your platform…</p>
    <ul class="chips">
      <li>Node.js 20+</li><li>MIT licensed</li><li>No telemetry</li><li>Works offline with Ollama</li>
    </ul>
  </section>

  <section id="downloads">
    <div class="section-title">
      <h2>Installers</h2>
      <span>${manifest.artifacts.length} artifacts · SHA-256 signed</span>
    </div>
    <div class="grid">
${cards}
    </div>
  </section>

  <section class="panel" id="verify">
    <h3>Verify your download</h3>
    <pre><code><span class="c"># macOS / Linux</span>
shasum -a 256 --check SHA256SUMS.txt

<span class="c"># Linux (GNU coreutils)</span>
sha256sum -c SHA256SUMS.txt

<span class="c"># Windows (PowerShell)</span>
Get-FileHash .\\VanillaAgent-${esc(VERSION)}-Windows-x64-Setup.exe -Algorithm SHA256</code></pre>
    <p style="color:var(--slate-400);font-size:.86rem;margin:0">
      Every checksum is also listed in <code class="mono">installers-manifest.json</code>.
      Unsigned binaries are expected: the packages are not code-signed yet, so macOS may ask you to
      right-click the installer and choose <strong>Open</strong> the first time.
    </p>
  </section>

  <section class="panel" id="requirements">
    <h3>Requirements</h3>
    <table>
      <tbody>
        <tr><th>Runtime</th><td>Node.js ${esc(manifest.requirements?.node || ">=20.0.0")} (the installers detect it for you)</td></tr>
        <tr><th>Memory</th><td>${esc(manifest.requirements?.memory || "2 GB RAM")}</td></tr>
        <tr><th>Disk</th><td>${esc(manifest.requirements?.disk || "3 MB runtime + dependencies")}</td></tr>
        <tr><th>Network</th><td>${esc(manifest.requirements?.network || "Required once")}</td></tr>
        <tr><th>AI brain</th><td>Ollama (free, local) or an API key from OpenAI, Anthropic, Google, xAI, DeepSeek or OpenRouter</td></tr>
      </tbody>
    </table>
  </section>
</main>

<footer>
  <div>© ${new Date().getFullYear()} VanillaAgent · MIT License · <a href="${esc(manifest.repository)}">ronavkarumsi04/VanillaAgent</a></div>
  <div class="mono">generated ${esc(manifest.generatedAt)}</div>
</footer>

<script>
(function () {
  var ua = navigator.userAgent || "";
  var platform = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || "";
  var archHint = (navigator.userAgentData && navigator.userAgentData.architecture) || "";

  var os = "linux";
  if (/Mac|iPhone|iPad/.test(ua) || /Mac/.test(platform)) os = "macos";
  else if (/Win/.test(ua) || /Win/.test(platform)) os = "windows";

  var arch = "x64";
  if (/aarch64|arm64|ARM64/.test(ua) || /arm/.test(archHint)) arch = "arm64";

  var cards = Array.prototype.slice.call(document.querySelectorAll(".card:not([data-kind='zip']):not([data-kind='tar.gz'])"));
  var match = null;
  cards.forEach(function (card) {
    if (card.dataset.os !== os) return;
    if (card.dataset.arch !== arch && card.dataset.arch !== "any") return;
    if (!match) match = card;
  });
  if (!match) {
    match = cards.filter(function (c) { return c.dataset.os === os; })[0] ||
            cards.filter(function (c) { return c.dataset.os === "unix"; })[0];
  }

  var label = document.getElementById("detected");
  if (match) {
    match.classList.add("recommended");
    var title = match.querySelector("h3");
    label.innerHTML = "Detected <b>" + (os === "macos" ? "macOS" : os === "windows" ? "Windows" : "Linux") +
      " · " + arch + "</b> — recommended: <b>" + (title ? title.textContent : "installer") + "</b>";
    var hero = document.getElementById("hero-download");
    var link = match.querySelector("a.btn-primary");
    if (hero && link) {
      hero.setAttribute("href", link.getAttribute("href"));
      hero.setAttribute("download", "");
      document.getElementById("hero-download-label").textContent = "Download for " +
        (os === "macos" ? "macOS" : os === "windows" ? "Windows" : "Linux");
    }
    match.scrollIntoView && match.classList.add("recommended");
  } else {
    label.textContent = "Pick the installer that matches your machine.";
  }

  document.querySelectorAll("[data-copy]").forEach(function (btn) {
    btn.addEventListener("click", function (event) {
      event.preventDefault();
      var value = btn.getAttribute("data-copy");
      var done = function () {
        var previous = btn.textContent;
        btn.textContent = "copied";
        setTimeout(function () { btn.textContent = previous; }, 1400);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(value).then(done, function () {});
      } else {
        var ta = document.createElement("textarea");
        ta.value = value; document.body.appendChild(ta); ta.select();
        try { document.execCommand("copy"); done(); } catch (e) {}
        document.body.removeChild(ta);
      }
    });
  });
})();
</script>
</body>
</html>
`;

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, html);
console.log(`  ✓ ${path.relative(REPO, OUT)} (${(fs.statSync(OUT).size / 1024).toFixed(0)} KB, ${manifest.artifacts.length} downloads)`);
