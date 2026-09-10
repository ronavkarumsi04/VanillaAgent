# 🛠️ VanillaAgent Installer Factory

Everything in this directory builds the **native installers** VanillaAgent ships for
macOS, Windows and Linux — all themed in the same dark teal as the Web GUI dashboard.

```
brand/theme.json ─┐
brand/fonts/*     ├─► make-brand.py ──► build/brand/  (logos, icns, ico, RTF, BMP, PNG)
                  │
dist/  + repo ───►│  stage-payload.mjs ──► build/payload/  (~3 MB, no node_modules)
                                                    │
        ┌───────────────┬───────────────┬───────────┴────────┬────────────────┐
        ▼               ▼               ▼                    ▼                ▼
   make-pkg.mjs    make-exe.sh      make-deb.sh          make-rpm.py   make-unix-installer.sh
   (.pkg arm64/x64)(NSIS .exe)   (.deb amd64/arm64) (.rpm x86_64/aarch64)  (.sh universal)
        └───────────────┴───────────────┴────────────────────┴────────────────┘
                                        │
                        make-manifest.mjs ──► installers-manifest.json
                      verify-installers.mjs ──► structural checks
                    make-download-page.mjs ──► releases/index.html
```

## Quick start

```bash
pnpm installers            # builds every target the host toolchain supports
pnpm installers --archives # …and the portable tar.gz/zip archives as well
pnpm installers --only deb # build a single family: pkg | exe | deb | rpm | unix

pnpm installers:verify     # re-run structural verification on releases/
pnpm brand                 # regenerate brand assets only
```

`scripts/build-installers.sh` is the driver: it renders brand assets, stages the payload,
builds each family, verifies the artifacts, writes `SHA256SUMS.txt` +
`installers-manifest.json` and renders the themed download page. Missing tools skip their
target with a warning instead of failing the build.

## Toolchain requirements

| Target | Requires | Skipped gracefully? |
|---|---|---|
| macOS `.pkg` | Node + `mkbom` + `xar-js` (repo devDependencies) | no — pure JS |
| Windows `.exe` | `makensis` (NSIS 3.x) and `NSISDIR` | **yes** |
| Debian `.deb` | `dpkg-deb` | **yes** |
| RPM | `python3` (pure-Python writer, no `rpmbuild`) | no |
| Universal `.sh` | `bash` + `tar` | no |

## What each builder produces

### `make-pkg.mjs` — macOS Installer package

A **flat package**: a xar container holding `Distribution` (the installer UI definition),
the themed `background.png`, `welcome.rtf`, `readme.rtf`, `license.rtf` and
`conclusion.rtf`, plus a component package with `Bom`, `PackageInfo`, a gzipped
**cpio odc** payload (`uid 0`, `gid 80`) and a `Scripts` archive containing `postinstall`.

The payload installs:
* `/Applications/VanillaAgent/VanillaAgent.app` — a real app bundle that boots the GUI,
* `/Applications/VanillaAgent/…` — runtime, `vanilla`, `vanilla-gui`, `vanilla-cli`,
* symlinks in `/usr/local/bin` and `/Applications/VanillaAgent/uninstall.sh` (created by
  `postinstall`).

Run `node scripts/installers/make-pkg.mjs --arch arm64|x64`.

### `vanilla-agent.nsi` + `make-exe.sh` — Windows setup

An NSIS script with hand-built `nsDialogs` pages (no MUI), using the brand palette as
COLORREF values and the generated `nsis-header.bmp` / `nsis-welcome.bmp` /
`nsis-logo.bmp` / `nsis-wordmark.bmp`:

welcome → license (RichEdit, dark background) → options (location, Node detection,
shortcuts, PATH) → instfiles (installs dependencies) → finish (launch the dashboard).

### `make-deb.sh` — Debian package

Installs to `/opt/vanilla-agent`, symlinks `/usr/bin/{vanilla,vanilla-gui,vanilla-cli}`,
ships a desktop entry, a 512×512 hicolor icon, AppStream metainfo and an optional
`systemd --user` unit. `postinst` bootstraps dependencies and prints a branded summary;
`prerm` / `postrm` clean up.

### `make-rpm.py` — RPM package

A self-contained RPM v3 writer (no `rpmbuild`): lead, signature header with a `62`
region trailer, main header with a `63` region trailer, and a gzipped **cpio newc**
payload. `%post` / `%preun` scriptlets mirror the deb maintainer scripts and it
recommends `nodejs >= 20`.

### `templates/unix-install.sh` + `make-unix-installer.sh` — universal installer

A single self-extracting shell script for macOS and Linux with a branded terminal UI:
ASCII banner, platform/Node preflight, install-location picker, animated progress,
symlinks, desktop entry, dependency bootstrap and a hand-written uninstaller. The
`tar.gz` payload is appended after the `__VA_PAYLOAD_BELOW__` marker and validated
against an embedded SHA-256.

Flags: `--prefix <dir>`, `--yes`, `--no-deps`, `--no-shortcuts`, `--uninstall`.

## Runtime templates

`templates/runtime/` holds the launchers that are copied into every payload:

| File | Purpose |
|---|---|
| `vanilla`, `vanilla-gui`, `vanilla-cli` (+ `.cmd`) | POSIX / Windows launchers |
| `lib/bootstrap.mjs` | dependency bootstrap (`bootstrap deps` primes them at install time) |
| `lib/open-browser.mjs` | health-polling browser opener |
| `lib/uninstall.sh`, `lib/uninstall.cmd` | uninstallers (agent state is preserved unless `--purge`) |

## Brand pipeline

`make-brand.py` renders every raster asset from `brand/theme.json` and the bundled
woff files with Pillow — WordmarkSVG + `fonttools` are used to render the teal→sky
gradient wordmark. Outputs land in `build/brand/`:

`logo-{512,1024}.png`, `favicon.ico`, `icon.icns`, `icon.ico`, `pkg-background.png`,
`nsis-{header,welcome,logo,wordmark}.bmp`, `social-card.png`, and the RTF pages used by
the macOS installer.
