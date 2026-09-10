#!/usr/bin/env node
/**
 * VanillaAgent Runtime Bootstrap
 * ──────────────────────────────
 * Cross-platform first-run helper shipped inside every VanillaAgent install.
 *
 * Responsibilities
 *   1. Verify the host has a supported Node.js runtime (>= 20).
 *   2. Install runtime dependencies (once) with pnpm or npm.
 *   3. Hand over to the requested entrypoint (core runtime / CLI).
 *
 * Usage:  node bootstrap.mjs <core|cli> [-- args...]
 */

import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import readline from "node:readline";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");

// ── Theme (mirrors brand/theme.json) ────────────────────────────────────────
const NO_COLOR = process.env.NO_COLOR === "1" || process.env.TERM === "dumb";
const useColor = process.stdout.isTTY && !NO_COLOR && process.platform !== "win32";
const C = {
  reset: useColor ? "\x1b[0m" : "",
  bold: useColor ? "\x1b[1m" : "",
  dim: useColor ? "\x1b[2m" : "",
  teal: useColor ? "\x1b[38;2;45;212;191m" : "",
  brand: useColor ? "\x1b[38;2;20;184;166m" : "",
  slate: useColor ? "\x1b[38;2;148;163;184m" : "",
  white: useColor ? "\x1b[38;2;226;232;240m" : "",
  amber: useColor ? "\x1b[38;2;251;191;36m" : "",
  rose: useColor ? "\x1b[38;2;251;113;133m" : "",
};

const APP = `${C.teal}◆${C.reset} ${C.bold}${C.white}VanillaAgent${C.reset}`;
const MIN_NODE = 20;

function manifest() {
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOT, "install-manifest.json"), "utf8"));
  } catch {
    return { version: "0.0.0", installId: "vanilla-agent" };
  }
}

function info(msg) {
  console.log(`${APP} ${C.slate}${msg}${C.reset}`);
}
function step(msg) {
  console.log(`${C.brand}  ▸${C.reset} ${msg}`);
}
function ok(msg) {
  console.log(`${C.teal}  ✓${C.reset} ${msg}`);
}
function warn(msg) {
  console.log(`${C.amber}  !${C.reset} ${C.amber}${msg}${C.reset}`);
}
function fail(msg) {
  console.log(`${C.rose}  ✗${C.reset} ${C.rose}${msg}${C.reset}`);
}

// ── Spinner ─────────────────────────────────────────────────────────────────
function spinner(label) {
  if (!(process.stdout.isTTY && !NO_COLOR)) {
    step(label);
    return { stop: (finalLabel) => ok(finalLabel || label) };
  }
  const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  let i = 0;
  const timer = setInterval(() => {
    readline.cursorTo(process.stdout, 0);
    process.stdout.write(
      `${C.brand}  ${frames[i++ % frames.length]}${C.reset} ${label}${C.dim}…${C.reset}   `
    );
  }, 90);
  return {
    stop(finalLabel) {
      clearInterval(timer);
      readline.cursorTo(process.stdout, 0);
      readline.clearLine(process.stdout, 0);
      ok(finalLabel || label);
    },
  };
}

// ── Node.js gate ────────────────────────────────────────────────────────────
function checkNode() {
  const major = Number(process.versions.node.split(".")[0]);
  if (major >= MIN_NODE) return true;
  console.error("");
  fail(`Node.js ${MIN_NODE}+ is required (found ${process.versions.node}).`);
  console.error(
    `${C.slate}  Install it from ${C.white}https://nodejs.org${C.slate} and run this command again.${C.reset}`
  );
  console.error("");
  process.exit(1);
}

// ── Dependency bootstrap ────────────────────────────────────────────────────
/** Key modules that must exist for the runtime to boot. */
const REQUIRED = ["better-sqlite3", "viem", "openai", "chalk"];

function depsReady() {
  const nm = path.join(ROOT, "node_modules");
  if (!fs.existsSync(nm)) return false;
  return REQUIRED.every((dep) => fs.existsSync(path.join(nm, dep)));
}

function commandExists(cmd) {
  const probe = spawnSync(cmd, ["--version"], { stdio: "ignore", shell: process.platform === "win32" });
  return probe.status === 0;
}

function runInstaller(bin, args) {
  const spin = spinner(`${bin} install — fetching runtime dependencies`);
  const result = spawnSync(bin, args, {
    cwd: ROOT,
    stdio: ["ignore", "ignore", "pipe"],
    shell: process.platform === "win32",
    env: { ...process.env, npm_config_update_notifier: "false" },
  });
  spin.stop();
  return result;
}

function installDeps() {
  const hasPnpmLock = fs.existsSync(path.join(ROOT, "pnpm-lock.yaml"));
  const attempts = [];
  if (hasPnpmLock && commandExists("pnpm")) {
    attempts.push(["pnpm", ["install", "--prod", "--reporter=append-only"]]);
  }
  attempts.push(["npm", ["install", "--omit=dev", "--no-audit", "--no-fund", "--loglevel=error"]]);

  let last = null;
  for (const [bin, args] of attempts) {
    last = runInstaller(bin, args);
    if (last.status === 0 && depsReady()) {
      ok("Runtime dependencies ready");
      return true;
    }
  }

  const detail = (last?.stderr || Buffer.from("")).toString().trim().split("\n").slice(-3).join("\n");
  console.log("");
  fail("Could not install the VanillaAgent runtime dependencies.");
  if (detail) console.log(`${C.dim}${detail}${C.reset}`);
  console.log("");
  console.log(`${C.slate}  Fix it by running, inside the install folder:${C.reset}`);
  console.log(`${C.white}      cd "${ROOT}" && npm install --omit=dev --no-audit --no-fund${C.reset}`);
  console.log(`${C.slate}  A network connection is required the first time.${C.reset}`);
  console.log("");
  return false;
}

// ── Entrypoint ──────────────────────────────────────────────────────────────
function main() {
  checkNode();

  const meta = manifest();
  const mode = process.argv[2] || "core";
  const rest = process.argv.slice(3);

  // `bootstrap deps` primes dependencies only (used by installers).
  if (mode === "deps") {
    if (depsReady()) {
      ok("Runtime dependencies already installed");
      process.exit(0);
    }
    info(`Preparing VanillaAgent ${meta.version} dependencies`);
    process.exit(installDeps() ? 0 : 1);
  }

  if (!depsReady()) {
    info(`Preparing VanillaAgent ${meta.version} (first launch on this machine)`);
    if (!installDeps()) process.exit(1);
  }

  const entry =
    mode === "cli" ? path.join(ROOT, "cli", "dist", "index.js") : path.join(ROOT, "app", "dist", "index.js");

  if (!fs.existsSync(entry)) {
    fail(`Missing runtime entrypoint: ${entry}`);
    process.exit(1);
  }

  // Agent state (wallet, memory, config) lives in ~/.vanilla-agent by default;
  // honour VANILLA_AGENT_DIR when the operator overrides it.
  const child = spawn(process.execPath, [entry, ...rest], {
    cwd: ROOT,
    stdio: "inherit",
    env: process.env,
  });

  child.on("exit", (code, signal) => {
    if (signal) process.kill(process.pid, signal);
    else process.exit(code ?? 0);
  });
  process.on("SIGINT", () => child.kill("SIGINT"));
  process.on("SIGTERM", () => child.kill("SIGTERM"));
}

main();
