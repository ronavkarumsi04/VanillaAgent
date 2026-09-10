#!/usr/bin/env python3
"""
VanillaAgent RPM Package Builder
================================

Builds a genuine RPM v3 package (lead + signature header + header + cpio.gz
payload) without rpmbuild, so release pipelines on any platform can produce
Fedora / RHEL / openSUSE packages.

Layout installed by the package mirrors the .deb:
    /opt/vanilla-agent/...                       runtime payload
    /usr/bin/{vanilla,vanilla-gui,vanilla-cli}   launcher symlinks
    /usr/share/applications/vanilla-agent.desktop
    /usr/share/icons/hicolor/512x512/apps/vanillaagent.png
    /usr/share/metainfo/com.vanillaagent.runtime.metainfo.xml
    /usr/lib/systemd/user/vanilla-agent.service

Usage:
    python3 scripts/installers/make-rpm.py --arch x86_64 \
        --payload build/payload --assets build/brand \
        --out releases/vanilla-agent-0.2.1-1.x86_64.rpm
"""

from __future__ import annotations

import argparse
import gzip
import hashlib
import json
import os
import shutil
import stat
import struct
import time
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
TEMPLATES = Path(__file__).resolve().parent / "templates" / "linux"

PREFIX = "/opt/vanilla-agent"

# ── Header tag constants ─────────────────────────────────────────────────────
HEADER_MAGIC = b"\x8e\xad\xe8\x01\x00\x00\x00\x00"

TAG_HEADERI18NTABLE = 100
TAG_NAME = 1000
TAG_VERSION = 1001
TAG_RELEASE = 1002
TAG_SUMMARY = 1004
TAG_DESCRIPTION = 1005
TAG_BUILDTIME = 1006
TAG_BUILDHOST = 1007
TAG_SIZE = 1009
TAG_LICENSE = 1014
TAG_GROUP = 1016
TAG_OS = 1021
TAG_ARCH = 1022
TAG_POSTIN = 1024
TAG_PREUN = 1025
TAG_POSTUN = 1026
TAG_FILESIZES = 1028
TAG_FILEMODES = 1030
TAG_FILERDEVS = 1033
TAG_FILEMTIMES = 1034
TAG_FILEDIGESTS = 1035
TAG_FILELINKTOS = 1036
TAG_FILEFLAGS = 1037
TAG_FILEUSERNAME = 1039
TAG_FILEGROUPNAME = 1040
TAG_FILEVERIFYFLAGS = 1045
TAG_PROVIDENAME = 1047
TAG_PROVIDEFLAGS = 1112
TAG_PROVIDEVERSION = 1113
TAG_DIRINDEXES = 1116
TAG_BASENAMES = 1117
TAG_DIRNAMES = 1118
TAG_PAYLOADFORMAT = 1124
TAG_PAYLOADCOMPRESSOR = 1125
TAG_PAYLOADFLAGS = 1126
TAG_POSTINPROG = 1086
TAG_PREUNPROG = 1093
TAG_POSTUNPROG = 1094
TAG_FILEDIGESTALGO = 5011
TAG_ENCODING = 5062
TAG_PAYLOADDIGEST = 5092
TAG_PAYLOADDIGESTALGO = 5093
TAG_RECOMMENDNAME = 5046
TAG_RECOMMENDVERSION = 5047
TAG_RECOMMENDFLAGS = 5048

SIGTAG_SIZE = 1000
SIGTAG_PAYLOADSIZE = 1007

TYPE_INT32 = 4
TYPE_INT16 = 3
TYPE_STRING = 6
TYPE_BIN = 7
TYPE_STRING_ARRAY = 8
TYPE_I18NSTRING = 9
SIGTAG_SHA256 = 273

RPMSENSE_GREATER = 0x04
RPMSENSE_EQUAL = 0x08
RPMSENSE_MISSINGOK = 0x01000000

HASH_SHA256 = 8

ALIGNMENT = {TYPE_INT16: 2, TYPE_INT32: 4}


# ── File tree model ──────────────────────────────────────────────────────────
class Entry:
    """One payload record: regular file, directory or symlink."""

    def __init__(self, path: str, mode: int, size: int, target: str | None, data: bytes, mtime: int):
        self.path = path  # absolute install path ("/opt/...")
        self.mode = mode
        self.size = size
        self.target = target
        self.data = data
        self.mtime = mtime
        self.digest = hashlib.sha256(data).hexdigest() if target is None and data else ""

    @property
    def is_dir(self) -> bool:
        return stat.S_ISDIR(self.mode)

    @property
    def is_link(self) -> bool:
        return stat.S_ISLNK(self.mode)


def collect_tree(root: Path, prefix: str) -> list[Entry]:
    """Walk a staged directory and emit RPM entries (parents first)."""
    entries: list[Entry] = []
    now = int(time.time())

    def add_dir(path: str) -> None:
        entries.append(Entry(path, 0o040755, 0, None, b"", now))

    def walk(src: Path, dest: str) -> None:
        add_dir(dest)
        for name in sorted(os.listdir(src)):
            s = src / name
            d = f"{dest}/{name}" if dest != "/" else f"/{name}"
            st = s.lstat()
            if stat.S_ISLNK(st.st_mode):
                target = os.readlink(s)
                entries.append(
                    Entry(d, 0o120777, len(target), target, target.encode(), int(st.st_mtime))
                )
            elif stat.S_ISDIR(st.st_mode):
                walk(s, d)
            else:
                data = s.read_bytes()
                mode = 0o100000 | (st.st_mode & 0o777)
                entries.append(Entry(d, mode, len(data), None, data, int(st.st_mtime)))

    walk(root, prefix)
    return entries


def single_file(path: str, data: bytes, mode: int = 0o100644) -> Entry:
    return Entry(path, mode, len(data), None, data, int(time.time()))


def symlink(path: str, target: str) -> Entry:
    return Entry(path, 0o120777, len(target), target, target.encode(), int(time.time()))


# ── cpio (newc) writer ───────────────────────────────────────────────────────
def cpio_newc(entries: list[Entry]) -> bytes:
    out = bytearray()
    ino = 1

    def pad(buf: bytearray) -> None:
        while len(buf) % 4:
            buf.append(0)

    for e in entries:
        name = e.path.lstrip("/").encode()
        size = len(e.data)
        out += b"070701"
        for value in (
            ino,
            e.mode,
            0,  # uid
            0,  # gid
            2 if e.is_dir else 1,  # nlink
            e.mtime,
            size,
            1,  # devmajor
            0,  # devminor  (values chosen to match rpm's cpio conventions)
            0,  # rdevmajor
            0,  # rdevminor
            len(name) + 1,
            0,  # check
        ):
            out += f"{value:08x}".encode()
        out += name + b"\0"
        pad(out)
        out += e.data
        pad(out)
        ino += 1

    name = b"TRAILER!!!"
    out += b"070701"
    for value in (0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, len(name) + 1, 0):
        out += f"{value:08x}".encode()
    out += name + b"\0"
    pad(out)
    return bytes(out)


# ── Header writer ────────────────────────────────────────────────────────────
class Header:
    """An RPM header: index entries + data store + immutable region trailer."""

    def __init__(self, region_tag: int = 63) -> None:
        self.tags: list[tuple[int, int, object]] = []
        # 63 (HEADERIMMUTABLE) for the main header, 62 for the signature header.
        self.region_tag = region_tag

    def add(self, tag: int, rtype: int, value) -> None:
        self.tags.append((tag, rtype, value))

    def int32(self, tag: int, values) -> None:
        if isinstance(values, int):
            values = [values]
        self.add(tag, TYPE_INT32, list(values))

    def int16(self, tag: int, values) -> None:
        self.add(tag, TYPE_INT16, list(values))

    def string(self, tag: int, value: str, rtype: int = TYPE_STRING) -> None:
        self.add(tag, rtype, value)

    def strings(self, tag: int, values) -> None:
        self.add(tag, TYPE_STRING_ARRAY, list(values))

    def build(self) -> bytes:
        # rpm requires index entries in ascending tag order.
        entries = sorted(self.tags, key=lambda item: item[0])

        # Lay out the store with per-type alignment.
        store = bytearray()
        index = bytearray()
        total = len(entries) + 1  # + the region entry

        # Region trailer: a 16 byte binary blob appended after every other entry.
        # Its "offset" field is negative: -(16 * number of index entries).
        region_offset = None
        for tag, rtype, value in entries:
            align = ALIGNMENT.get(rtype, 1)
            while len(store) % align:
                store.append(0)
            offset = len(store)
            if rtype in (TYPE_STRING, TYPE_I18NSTRING):
                assert isinstance(value, str)
                store += value.encode("utf-8") + b"\0"
                count = 1
            elif rtype == TYPE_STRING_ARRAY:
                count = len(value)
                for item in value:
                    store += item.encode("utf-8") + b"\0"
            elif rtype == TYPE_BIN:
                count = len(value)
                store += value
            elif rtype == TYPE_INT16:
                count = len(value)
                for item in value:
                    store += struct.pack(">H", item & 0xFFFF)
            elif rtype == TYPE_INT32:
                count = len(value)
                for item in value:
                    store += struct.pack(">I", item & 0xFFFFFFFF)
            else:
                raise ValueError(f"unsupported rpm type {rtype}")
            index += struct.pack(">IIII", tag, rtype, offset, count)

        region_offset = len(store)
        store += struct.pack(">iiii", self.region_tag, TYPE_BIN, -16 * total, 16)
        region_index = struct.pack(">IIII", self.region_tag, TYPE_BIN, region_offset, 16)

        header = bytearray()
        header += HEADER_MAGIC
        header += struct.pack(">II", total, len(store))
        header += region_index
        header += index
        header += store
        return bytes(header)


def pad_to_8(data: bytes) -> bytes:
    rem = len(data) % 8
    return data if rem == 0 else data + b"\0" * (8 - rem)


# ── Package assembly ─────────────────────────────────────────────────────────
def build_lead(name: str, arch_num: int) -> bytes:
    lead = bytearray()
    lead += b"\xed\xab\xee\xdb"  # magic
    lead += bytes([3, 0])  # major, minor
    lead += struct.pack(">H", 0)  # type: binary
    lead += struct.pack(">H", arch_num)
    lead += name.encode("utf-8")[:65].ljust(66, b"\0")
    lead += struct.pack(">H", 1)  # os: linux
    lead += struct.pack(">H", 5)  # signature type: header signatures
    lead += b"\0" * 16  # reserved
    assert len(lead) == 96
    return bytes(lead)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--arch", default="x86_64")
    parser.add_argument("--version", default=None)
    parser.add_argument("--release", default="1")
    parser.add_argument("--payload", default=str(REPO_ROOT / "build" / "payload"))
    parser.add_argument("--assets", default=str(REPO_ROOT / "build" / "brand"))
    parser.add_argument("--out", default=None)
    parser.add_argument("--work", default=None)
    args = parser.parse_args()

    version = args.version or json.loads((REPO_ROOT / "package.json").read_text())["version"]
    arch = args.arch
    out = Path(args.out).resolve() if args.out else (REPO_ROOT / f"releases/vanilla-agent-{version}-{args.release}.{arch}.rpm")
    work = Path(args.work or REPO_ROOT / "build" / "stage" / "rpm" / arch)
    payload = Path(args.payload)
    assets = Path(args.assets)

    print(f"  ▸ RPM package ({arch})")

    if work.exists():
        shutil.rmtree(work)
    (work / PREFIX.lstrip("/")).mkdir(parents=True, exist_ok=True)
    shutil.copytree(payload, work / PREFIX.lstrip("/"), dirs_exist_ok=True)
    for launcher in ("vanilla", "vanilla-gui", "vanilla-cli"):
        (work / PREFIX.lstrip("/") / launcher).chmod(0o755)

    entries: list[Entry] = []
    entries += collect_tree(work / PREFIX.lstrip("/"), PREFIX)
    entries += [
        symlink("/usr/bin/vanilla", f"{PREFIX}/vanilla"),
        symlink("/usr/bin/vanilla-gui", f"{PREFIX}/vanilla-gui"),
        symlink("/usr/bin/vanilla-cli", f"{PREFIX}/vanilla-cli"),
    ]

    desktop = (TEMPLATES / "vanilla-agent.desktop").read_text().rstrip() + "\n"
    entries.append(single_file("/usr/share/applications/vanilla-agent.desktop", desktop.encode()))
    entries.append(
        single_file(
            "/usr/share/icons/hicolor/512x512/apps/vanillaagent.png",
            (assets / "logo-512.png").read_bytes(),
        )
    )
    metainfo = (
        (TEMPLATES / "com.vanillaagent.runtime.metainfo.xml")
        .read_text()
        .replace("@@VERSION@@", version)
        .replace("@@DATE@@", time.strftime("%Y-%m-%d", time.gmtime()))
    )
    entries.append(
        single_file("/usr/share/metainfo/com.vanillaagent.runtime.metainfo.xml", metainfo.encode())
    )
    service = (TEMPLATES / "vanilla-agent.service").read_text().replace(
        "@@EXEC_START@@", f"{PREFIX}/vanilla --run"
    )
    entries.append(single_file("/usr/lib/systemd/user/vanilla-agent.service", service.encode()))

    # ── Payload ──────────────────────────────────────────────────────────────
    uncompressed = cpio_newc(entries)
    compressed = gzip.compress(uncompressed, compresslevel=9, mtime=0)

    # ── Main header ──────────────────────────────────────────────────────────
    dirnames = sorted({str(Path(e.path).parent) + "/" for e in entries})
    dir_index = {d: i for i, d in enumerate(dirnames)}

    h = Header(region_tag=63)
    h.strings(TAG_HEADERI18NTABLE, ["C"])
    h.string(TAG_NAME, "vanilla-agent")
    h.string(TAG_VERSION, version)
    h.string(TAG_RELEASE, args.release)
    h.string(TAG_SUMMARY, "Sovereign autonomous AI agent runtime and swarm engine", TYPE_I18NSTRING)
    h.string(
        TAG_DESCRIPTION,
        "VanillaAgent is a sovereign autonomous agent runtime: it holds its own EVM and\n"
        "Solana wallet, pays for its own compute, keeps a five-tier cognitive memory and\n"
        "coordinates work inside multi-agent swarms.\n"
        "\n"
        "This package installs the runtime into " + PREFIX + ", exposes the vanilla,\n"
        "vanilla-gui and vanilla-cli commands, ships a desktop entry for the Web GUI\n"
        "control panel served on http://localhost:3000 and an optional systemd user\n"
        "service (vanilla-agent.service).\n",
        TYPE_I18NSTRING,
    )
    h.int32(TAG_BUILDTIME, int(time.time()))
    h.string(TAG_BUILDHOST, "vanillaagent.dev")
    h.int32(TAG_SIZE, sum(e.size for e in entries if not e.is_dir))
    h.string(TAG_LICENSE, "MIT")
    h.string(TAG_GROUP, "Applications/System", TYPE_I18NSTRING)
    h.string(TAG_OS, "linux")
    h.string(TAG_ARCH, arch)
    h.string(TAG_PAYLOADFORMAT, "cpio")
    h.string(TAG_PAYLOADCOMPRESSOR, "gzip")
    h.string(TAG_PAYLOADFLAGS, "9")
    h.string(TAG_ENCODING, "utf-8")
    h.int32(TAG_FILEDIGESTALGO, HASH_SHA256)
    h.strings(TAG_PAYLOADDIGEST, [hashlib.sha256(uncompressed).hexdigest()])
    h.int32(TAG_PAYLOADDIGESTALGO, HASH_SHA256)

    h.int32(TAG_FILESIZES, [e.size for e in entries])
    h.int16(TAG_FILEMODES, [e.mode & 0xFFFF for e in entries])
    h.int16(TAG_FILERDEVS, [0 for _ in entries])
    h.int32(TAG_FILEMTIMES, [e.mtime for e in entries])
    h.strings(TAG_FILEDIGESTS, [e.digest if not e.is_dir else "" for e in entries])
    h.strings(TAG_FILELINKTOS, [e.target or "" for e in entries])
    h.int32(TAG_FILEFLAGS, [0 for _ in entries])
    h.strings(TAG_FILEUSERNAME, ["root" for _ in entries])
    h.strings(TAG_FILEGROUPNAME, ["root" for _ in entries])
    h.int32(TAG_FILEVERIFYFLAGS, [0xFFFFFFFF for _ in entries])
    h.int32(TAG_DIRINDEXES, [dir_index[str(Path(e.path).parent) + "/"] for e in entries])
    h.strings(TAG_BASENAMES, [Path(e.path).name for e in entries])
    h.strings(TAG_DIRNAMES, dirnames)

    h.strings(TAG_PROVIDENAME, ["vanilla-agent", f"vanilla-agent({arch})"])
    h.int32(TAG_PROVIDEFLAGS, [RPMSENSE_EQUAL, RPMSENSE_EQUAL])
    h.strings(TAG_PROVIDEVERSION, [f"{version}-{args.release}", f"{version}-{args.release}"])

    weak = RPMSENSE_MISSINGOK | RPMSENSE_GREATER | RPMSENSE_EQUAL
    h.strings(TAG_RECOMMENDNAME, ["nodejs"])
    h.strings(TAG_RECOMMENDVERSION, ["20.0.0"])
    h.int32(TAG_RECOMMENDFLAGS, [weak])

    post = """#!/bin/sh
set -e
PREFIX="%s"
LOG=/var/log/vanilla-agent-install.log
echo "VanillaAgent: %%post" >> "$LOG" 2>/dev/null || true
chmod -R a+rX "$PREFIX" 2>/dev/null || true
chmod 755 "$PREFIX/vanilla" "$PREFIX/vanilla-gui" "$PREFIX/vanilla-cli" 2>/dev/null || true
if command -v node >/dev/null 2>&1; then
  MAJOR=$(node -v 2>/dev/null | sed 's/^v//' | cut -d. -f1)
  if [ -n "$MAJOR" ] && [ "$MAJOR" -ge 20 ] 2>/dev/null; then
    ( cd "$PREFIX" && timeout 900 npm install --omit=dev --no-audit --no-fund ) >> "$LOG" 2>&1 \\
      || echo "VanillaAgent: npm install failed; the launcher retries on first run" >> "$LOG" 2>&1 || true
  else
    echo "VanillaAgent: Node.js 20+ is required (found $(node -v 2>/dev/null || echo none))." >&2
  fi
else
  echo "VanillaAgent: Node.js was not found. Install Node.js 20+ then run: vanilla --run" >&2
fi
if command -v systemctl >/dev/null 2>&1; then
  systemctl --user daemon-reload >/dev/null 2>&1 || systemctl daemon-reload >/dev/null 2>&1 || true
fi
if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database -q /usr/share/applications >/dev/null 2>&1 || true
fi
exit 0
""" % PREFIX

    preun = """#!/bin/sh
set -e
if command -v systemctl >/dev/null 2>&1; then
  systemctl --user stop vanilla-agent.service >/dev/null 2>&1 || true
  systemctl --user disable vanilla-agent.service >/dev/null 2>&1 || true
fi
exit 0
"""

    postun = """#!/bin/sh
set -e
if [ "$1" = "0" ]; then
  rm -rf /opt/vanilla-agent/node_modules 2>/dev/null || true
  rm -rf /opt/vanilla-agent 2>/dev/null || true
  rm -f /var/log/vanilla-agent-install.log 2>/dev/null || true
fi
if command -v systemctl >/dev/null 2>&1; then
  systemctl --user daemon-reload >/dev/null 2>&1 || systemctl daemon-reload >/dev/null 2>&1 || true
fi
exit 0
"""

    h.string(TAG_POSTIN, post)
    h.string(TAG_POSTINPROG, "/bin/sh")
    h.string(TAG_PREUN, preun)
    h.string(TAG_PREUNPROG, "/bin/sh")
    h.string(TAG_POSTUN, postun)
    h.string(TAG_POSTUNPROG, "/bin/sh")

    header = h.build()

    # ── Signature header ─────────────────────────────────────────────────────
    sig = Header(region_tag=62)
    sig.int32(SIGTAG_SIZE, len(header) + len(compressed))
    sig.int32(SIGTAG_PAYLOADSIZE, len(uncompressed))
    sig.add(SIGTAG_SHA256, TYPE_STRING, hashlib.sha256(header).hexdigest())
    signature = pad_to_8(sig.build())

    # ── Lead ─────────────────────────────────────────────────────────────────
    arch_num = 1  # the lead's archnum is legacy metadata; rpm reads TAG_ARCH
    lead = build_lead(f"vanilla-agent-{version}-{args.release}.{arch}", arch_num)

    out.parent.mkdir(parents=True, exist_ok=True)
    with open(out, "wb") as fh:
        fh.write(lead)
        fh.write(signature)
        fh.write(header)
        fh.write(compressed)

    print(
        f"  ✓ {out.relative_to(REPO_ROOT)} "
        f"({out.stat().st_size / 1024 / 1024:.2f} MB, {len(entries)} payload entries)"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
