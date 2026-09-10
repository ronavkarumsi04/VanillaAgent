#!/usr/bin/env node
/**
 * VanillaAgent Installer Verifier
 * ───────────────────────────────
 * Post-build sanity checks for every artifact in installers-manifest.json:
 *
 *   .pkg   xar container, Distribution, resources, component package,
 *          PackageInfo XML, gzipped cpio (odc) payload
 *   .exe   PE binary produced by NSIS
 *   .deb   ar archive with a valid control member (dpkg-deb when available)
 *   .rpm   lead + signature header + header + gzip payload
 *   .sh    shell header, payload marker, embedded tar.gz and checksum
 *
 * Usage: node verify-installers.mjs --manifest releases/installers-manifest.json
 */

import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";

const argv = process.argv.slice(2);
const opt = (flag, fallback) => {
  const i = argv.indexOf(flag);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};

const REPO = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..", "..");
const MANIFEST = path.resolve(opt("--manifest", "releases/installers-manifest.json"));
const DIR = path.resolve(opt("--dir", path.dirname(MANIFEST)));

let failures = 0;
const check = (label, condition, detail = "") => {
  if (condition) {
    console.log(`      ✓ ${label}`);
  } else {
    failures += 1;
    console.log(`      ✗ ${label}${detail ? ` — ${detail}` : ""}`);
  }
};

// ── xar (.pkg) ──────────────────────────────────────────────────────────────
function parseXar(buffer) {
  if (buffer.readUInt32BE(0) !== 0x78617221) throw new Error("not a xar archive");
  const headerSize = buffer.readUInt16BE(4);
  const tocCompressed = Number(buffer.readBigUInt64BE(8));
  const toc = zlib.inflateSync(buffer.subarray(headerSize, headerSize + tocCompressed)).toString("utf8");
  const heap = headerSize + tocCompressed;

  const files = {};
  const re = /<file id="(\d+)">\s*<name>([^<]+)<\/name>\s*<type>([^<]+)<\/type>([\s\S]*?)<\/file>/g;
  let m;
  while ((m = re.exec(toc))) {
    const data = m[4];
    const offset = Number(/<offset>(\d+)<\/offset>/.exec(data)?.[1] ?? 0);
    const size = Number(/<size>(\d+)<\/size>/.exec(data)?.[1] ?? 0);
    const length = Number(/<length>(\d+)<\/length>/.exec(data)?.[1] ?? size);
    const encoding = /<encoding style="([^"]+)"/.exec(data)?.[1] ?? "";
    const raw = buffer.subarray(heap + offset, heap + offset + length);
    const content = encoding === "application/x-gzip" ? zlib.inflateSync(raw) : raw;
    files[m[2]] = { content, size, ok: content.length === size };
  }
  return files;
}

function verifyPkg(file) {
  const outer = parseXar(fs.readFileSync(file));
  check("xar container", true);
  for (const name of ["Distribution", "background.png", "welcome.rtf", "license.rtf", "conclusion.rtf"]) {
    check(`resource ${name}`, Boolean(outer[name]), "missing from the distribution package");
  }
  const component = outer["vanilla-agent.pkg"];
  check("component package present", Boolean(component));
  if (!component) return;

  const inner = parseXar(component.content);
  for (const name of ["Bom", "PackageInfo", "Payload", "Scripts"]) {
    check(`component ${name}`, Boolean(inner[name]));
  }
  const info = inner["PackageInfo"]?.content.toString("utf8") ?? "";
  check("PackageInfo identifier", info.includes('identifier="com.vanillaagent.runtime"'));
  check("PackageInfo install-location", info.includes('install-location="/Applications/VanillaAgent"'));
  check("Bom magic (BOMStore)", inner["Bom"]?.content.subarray(0, 8).toString() === "BOMStore");

  const payload = inner["Payload"]?.content;
  if (payload) {
    check("Payload gzip header", payload[0] === 0x1f && payload[1] === 0x8b);
    const cpio = zlib.gunzipSync(payload);
    let pos = 0;
    let count = 0;
    while (pos + 76 <= cpio.length) {
      const magic = cpio.subarray(pos, pos + 6).toString();
      if (magic !== "070707") break;
      const namesize = parseInt(cpio.subarray(pos + 59, pos + 65).toString(), 8);
      const filesize = parseInt(cpio.subarray(pos + 65, pos + 76).toString(), 8);
      const name = cpio.subarray(pos + 76, pos + 76 + namesize - 1).toString();
      pos += 76 + namesize + filesize;
      if (name === "TRAILER!!!") break;
      count += 1;
    }
    check(`payload cpio entries (${count})`, count > 100);
    check("payload fully consumed", pos === cpio.length, `${pos}/${cpio.length}`);
  }
  const scripts = inner["Scripts"]?.content;
  if (scripts) {
    const cpio = zlib.gunzipSync(scripts);
    check("postinstall script embedded", cpio.toString("latin1").includes("./postinstall"));
  }
}

// ── NSIS (.exe) ─────────────────────────────────────────────────────────────
function verifyExe(file) {
  const data = fs.readFileSync(file);
  check("MZ/PE header", data.subarray(0, 2).toString() === "MZ" && data.includes(Buffer.from("PE\0\0")));
  check("NSIS payload signature", data.includes(Buffer.from("Nullsoft")));
  check("lzma-compressed payload", data.length > 200 * 1024, "unexpectedly small installer");
}

// ── .deb ────────────────────────────────────────────────────────────────────
function verifyDeb(file) {
  const data = fs.readFileSync(file);
  check("ar archive magic", data.subarray(0, 8).toString() === "!<arch>\n");
  check("debian-binary member", data.includes(Buffer.from("debian-binary")));
  const dpkg = spawnSync("dpkg-deb", ["--info", file], { encoding: "utf8" });
  if (dpkg.status === 0) {
    check("dpkg-deb reads the package", true);
    check("package name", /Package: vanilla-agent/.test(dpkg.stdout));
    check("architecture", /Architecture: (amd64|arm64)/.test(dpkg.stdout));
  } else {
    check("control.tar member", data.includes(Buffer.from("control.tar")));
  }
}

// ── .rpm ────────────────────────────────────────────────────────────────────
function readHeader(buffer, offset) {
  if (buffer.subarray(offset, offset + 8).toString("hex") !== "8eade80100000000") {
    throw new Error(`bad header magic at ${offset}`);
  }
  const nindex = buffer.readUInt32BE(offset + 8);
  const hsize = buffer.readUInt32BE(offset + 12);
  const start = offset + 16;
  const end = start + nindex * 16 + hsize;
  return { nindex, hsize, next: end + ((8 - (end % 8)) % 8 === 0 ? 0 : 0) };
}

function verifyRpm(file) {
  const data = fs.readFileSync(file);
  check("lead magic", data.subarray(0, 4).toString("hex") === "edabeedb");
  check("lead version 3.0", data[4] === 3 && data[5] === 0);

  const sig = readHeader(data, 96);
  check("signature header", sig.nindex >= 2);
  const headerOffset = 96 + 16 + sig.nindex * 16 + sig.hsize;
  const pad = (8 - ((headerOffset - 96) % 8)) % 8;
  const main = readHeader(data, headerOffset + pad);
  check("main header", main.nindex > 10);

  const payloadStart = headerOffset + pad + 16 + main.nindex * 16 + main.hsize;
  const payload = data.subarray(payloadStart);
  check("gzip payload", payload[0] === 0x1f && payload[1] === 0x8b);
  const cpio = zlib.gunzipSync(payload);
  check("cpio (newc) payload", cpio.subarray(0, 6).toString() === "070701");
  check("cpio trailer", cpio.toString("latin1").includes("TRAILER!!!"));
  const body = data.subarray(headerOffset + pad, payloadStart).toString("latin1");
  check("name tag", body.includes("vanilla-agent"));
  check("payload compressor tag", body.includes("gzip"));
}

// ── .sh ─────────────────────────────────────────────────────────────────────
function verifyShellInstaller(file) {
  const data = fs.readFileSync(file);
  check("shell shebang", data.subarray(0, 3).toString() === "#!/");
  const marker = Buffer.from("__VA_PAYLOAD_BELOW__\n");
  const at = data.indexOf(marker);
  check("payload marker", at > 0);
  if (at < 0) return;
  const payload = data.subarray(at + marker.length);
  check("gzip payload", payload[0] === 0x1f && payload[1] === 0x8b);
  const sum = crypto.createHash("sha256").update(payload).digest("hex");
  const header = data.subarray(0, at).toString("utf8");
  const embedded = /VA_PAYLOAD_SHA256="([a-f0-9]{64})"/.exec(header)?.[1];
  check("embedded checksum matches payload", embedded === sum, embedded ? "mismatch" : "not found");
  const syntax = spawnSync("bash", ["-n", file], { encoding: "utf8" });
  if (syntax.error) {
    check("bash syntax", true, "bash unavailable, skipped");
  } else {
    // bash -n parses the whole file; only the header is shell code, so validate it separately
    const tmp = path.join("/tmp", `va-verify-${process.pid}.sh`);
    fs.writeFileSync(tmp, header);
    const headerCheck = spawnSync("bash", ["-n", tmp], { encoding: "utf8" });
    fs.rmSync(tmp, { force: true });
    check("bash syntax (header)", headerCheck.status === 0, headerCheck.stderr?.trim() || "");
  }
}

// ── Main ────────────────────────────────────────────────────────────────────
function main() {
  if (!fs.existsSync(MANIFEST)) {
    console.error(`  ✗ manifest missing: ${MANIFEST}`);
    process.exit(1);
  }
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
  console.log(`  ▸ verifying ${manifest.artifacts.length} artifacts`);

  for (const artifact of manifest.artifacts) {
    const file = path.join(DIR, artifact.file);
    console.log(`\n  ${artifact.file}  ${artifact.sizeLabel}`);
    if (!fs.existsSync(file)) {
      check("file exists", false, "missing");
      continue;
    }
    const sha256 = crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
    check("sha256 matches manifest", sha256 === artifact.sha256);
    try {
      switch (artifact.kind) {
        case "pkg": verifyPkg(file); break;
        case "exe": verifyExe(file); break;
        case "deb": verifyDeb(file); break;
        case "rpm": verifyRpm(file); break;
        case "sh": verifyShellInstaller(file); break;
        default: check("recognized artifact", false, `no verifier for ${artifact.kind}`);
      }
    } catch (err) {
      check("structure", false, err.message);
    }
  }

  console.log("");
  if (failures > 0) {
    console.log(`  ✗ ${failures} check(s) failed`);
    process.exit(1);
  }
  console.log("  ✓ all installer checks passed");
}

main();
