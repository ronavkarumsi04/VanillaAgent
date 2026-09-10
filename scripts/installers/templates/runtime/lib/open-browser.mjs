#!/usr/bin/env node
/**
 * VanillaAgent Browser Launcher
 * Polls the local dashboard health endpoint and opens the default browser the
 * moment the runtime is serving. Cross-platform (macOS / Linux / Windows).
 *
 * Usage: node open-browser.mjs [--port 3000] [--timeout 90]
 */

import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const args = process.argv.slice(2);
const read = (flag, fallback) => {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const port = read("--port", process.env.PORT || process.env.METRICS_PORT || "3000");
const timeoutSec = Number(read("--timeout", "90"));
const url = `http://localhost:${port}`;

async function healthy() {
  try {
    const res = await fetch(`${url}/health`, { signal: AbortSignal.timeout(1500) });
    return res.ok;
  } catch {
    return false;
  }
}

function open(url) {
  const platform = process.platform;
  const cmd =
    platform === "darwin" ? { bin: "open", args: [url] } :
    platform === "win32" ? { bin: "cmd", args: ["/c", "start", "", url] } :
    { bin: "xdg-open", args: [url] };
  const child = spawn(cmd.bin, cmd.args, { stdio: "ignore", detached: true, shell: platform === "win32" });
  child.unref();
}

const started = Date.now();
while (Date.now() - started < timeoutSec * 1000) {
  if (await healthy()) {
    open(url);
    process.exit(0);
  }
  await delay(700);
}
process.exit(1);
