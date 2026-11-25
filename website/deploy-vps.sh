#!/usr/bin/env bash
# SPDX-License-Identifier: MIT
set -euo pipefail
umask 022
cd "$(dirname "$0")/.."
ROOT=/srv/dx-trace/landing
BACKUPS=/srv/dx-trace/docs-backups
VENV=/opt/dxtrace-docs-venv
test -f "$ROOT/index.html" || { echo "Landing root not found"; exit 1; }
python3 -m venv "$VENV"
"$VENV/bin/python" -m pip install -r website/requirements.txt
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
"$VENV/bin/python" website/build.py --out "$TMP/site"
"$VENV/bin/python" website/verify.py "$TMP/site"
install -d -m 700 "$BACKUPS"
chmod 700 "$BACKUPS"
cp -a "$ROOT/index.html" "$BACKUPS/landing-index-$(date -u +%Y%m%dT%H%M%S)-$.html"
STAGE=$(mktemp -d /srv/dx-trace/.docs-stage.XXXXXX)
trap 'rm -rf "$TMP" "$STAGE"' EXIT
cp -a "$TMP/site/docs/." "$STAGE/"
find "$STAGE" -type d -exec chmod 755 {} +
find "$STAGE" -type f -exec chmod 644 {} +
OLD=""
if [ -e "$ROOT/docs" ] || [ -L "$ROOT/docs" ]; then
    OLD="$BACKUPS/docs-$(date -u +%Y%m%dT%H%M%S)-$$"
    mv -- "$ROOT/docs" "$OLD"
fi
if ! mv -- "$STAGE" "$ROOT/docs"; then
    if [ -n "$OLD" ]; then mv -- "$OLD" "$ROOT/docs"; fi
    exit 1
fi
# Publish shared assets before either language points to the new edition.
install -d -m 755 "$ROOT/assets" "$ROOT/assets/fonts" "$ROOT/en"
install -m 644 landing/assets/{brand-lockup.svg,mark.svg,food-distribution.webp,site.css,site.js} "$ROOT/assets/"
install -m 644 landing/assets/fonts/* "$ROOT/assets/fonts/"
install -m 644 landing/404.html "$ROOT/404.html"
install -m 644 landing/index.html "$ROOT/index.html"
install -m 644 landing/en/index.html "$ROOT/en/index.html"
echo "DX-TRACE Docs: https://dxtrace.hieuds.com/docs/"
if [ -n "$OLD" ]; then echo "Previous docs: $OLD"; fi
