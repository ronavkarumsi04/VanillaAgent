#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# VanillaAgent — uninstaller
# Removes the installed runtime, CLI symlinks, desktop entry and icons.
#
#   ./uninstall.sh            interactive (agent state is preserved)
#   ./uninstall.sh --yes      non-interactive
#   ./uninstall.sh --purge    also delete ~/.vanilla-agent (wallet, memory, config)
# ─────────────────────────────────────────────────────────────
set -uo pipefail

SOURCE="${BASH_SOURCE[0]}"
while [ -L "$SOURCE" ]; do
  DIR="$(cd -P "$(dirname "$SOURCE")" && pwd)"
  SOURCE="$(readlink "$SOURCE")"
  [[ $SOURCE != /* ]] && SOURCE="$DIR/$SOURCE"
done
ROOT="$(cd -P "$(dirname "$SOURCE")/.." && pwd)"

ASSUME_YES=0
KEEP_DATA=1
for arg in "$@"; do
  case "$arg" in
    --yes|-y) ASSUME_YES=1 ;;
    --purge) KEEP_DATA=0 ;;
  esac
done

if [ -t 1 ] && [ -z "${NO_COLOR:-}" ]; then
  TEAL=$'\033[38;2;45;212;191m'; BRAND=$'\033[38;2;20;184;166m'
  WHITE=$'\033[38;2;226;232;240m'; DIM=$'\033[2m'; RESET=$'\033[0m'
  ROSE=$'\033[38;2;251;113;133m'; BOLD=$'\033[1m'
else
  TEAL=""; BRAND=""; WHITE=""; DIM=""; RESET=""; ROSE=""; BOLD=""
fi

printf "\n%s%s◆%s %s%sVanillaAgent%s %suninstaller%s\n\n" \
  "$TEAL" "$BOLD" "$RESET" "$BOLD" "$WHITE" "$RESET" "$DIM" "$RESET"
printf "  %sInstall location%s  %s%s%s\n" "$BRAND" "$RESET" "$WHITE" "$ROOT" "$RESET"

if [ "$KEEP_DATA" = "1" ]; then
  printf "  %sAgent state%s      %skept — %s/.vanilla-agent%s\n" "$BRAND" "$RESET" "$WHITE" "${HOME:-~}" "$RESET"
else
  printf "  %sAgent state%s      %sdeleted — %s/.vanilla-agent%s\n" "$BRAND" "$RESET" "$ROSE" "${HOME:-~}" "$RESET"
fi
printf "\n"

if [ "$ASSUME_YES" != "1" ]; then
  printf "  %sContinue?%s [y/N] " "$WHITE" "$RESET"
  read -r reply
  case "$reply" in
    y|Y|yes|YES) ;;
    *) printf "  %sAborted.%s\n\n" "$DIM" "$RESET"; exit 0 ;;
  esac
fi

run() { # run <label> <command...>
  local label="$1"; shift
  if "$@" >/dev/null 2>&1; then
    printf "  %s✓%s %s%s%s\n" "$TEAL" "$RESET" "$DIM" "$label" "$RESET"
  fi
}

# Symlinks (created by the installer when /usr/local/bin is writable)
for link in vanilla vanilla-gui vanilla-cli; do
  if [ -L "/usr/local/bin/$link" ]; then
    run "removed /usr/local/bin/$link" rm -f "/usr/local/bin/$link"
  fi
done

# Linux desktop integration
run "removed desktop entry" rm -f "${XDG_DATA_HOME:-$HOME/.local/share}/applications/vanilla-agent.desktop"
run "removed application icon" rm -f "${XDG_DATA_HOME:-$HOME/.local/share}/icons/hicolor/512x512/apps/vanillaagent.png"
run "removed user service" rm -f "${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user/vanilla-agent.service"
if command -v systemctl >/dev/null 2>&1; then
  systemctl --user disable vanilla-agent.service >/dev/null 2>&1 || true
  systemctl --user daemon-reload >/dev/null 2>&1 || true
fi
if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database "${XDG_DATA_HOME:-$HOME/.local/share}/applications" >/dev/null 2>&1 || true
fi

# Agent state
if [ "$KEEP_DATA" != "1" ]; then
  if [ -d "${HOME:-~}/.vanilla-agent" ]; then
    run "removed agent state" rm -rf "${HOME:-~}/.vanilla-agent"
  fi
fi

# The runtime itself
if [ "$ROOT" != "/" ] && [ -d "$ROOT" ]; then
  rm -rf "$ROOT" >/dev/null 2>&1 || true
  printf "  %s✓%s %sremoved %s%s\n" "$TEAL" "$RESET" "$DIM" "$ROOT" "$RESET"
fi

printf "\n  %s%sVanillaAgent uninstalled.%s\n" "$BOLD" "$WHITE" "$RESET"
printf "  %sThanks for running sovereign.%s\n\n" "$DIM" "$RESET"
