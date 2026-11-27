#!/usr/bin/env bash
# SPDX-License-Identifier: MIT
# SPDX-FileCopyrightText: 2026 DX-TRACE contributors
set -euo pipefail
src=$(cd "$(dirname "$0")/.." && pwd -P)
dest=$(realpath -m "${1:?Usage: clean-install.sh NEW_INSTALL_DIRECTORY}")
[[ ! -e "$dest" && "$dest/" != "$src/"* ]] || { echo "Choose a new directory outside the source tree" >&2; exit 2; }
cd "$src"
pnpm install --frozen-lockfile
node selfhost/build.mjs
mkdir -p "$(dirname "$dest")"
stage=$(mktemp -d "$(dirname "$dest")/.dx-install.XXXXXX")
trap 'rm -rf "$stage"' EXIT
mkdir -p "$stage"/{bin,app,selfhost/flowable,tools,node_modules,examples/maintenance}
mkdir -p "$stage/sdk"
npm pack ./sdk --ignore-scripts --pack-destination "$stage/sdk" >/dev/null
cp -R lib drizzle apps "$stage/"
cp -R app/api "$stage/app/"
cp -R selfhost/generated "$stage/selfhost/"
cp selfhost/*.mjs "$stage/selfhost/"
cp selfhost/flowable/*.xml selfhost/flowable/*.bpmn "$stage/selfhost/flowable/"
cp tools/{dxtrace,app-cli,evidence-cli}.mjs "$stage/tools/"
cp examples/maintenance/model.json "$stage/examples/maintenance/"
cp LICENSE NOTICE THIRD_PARTY_NOTICES.md package.json "$stage/"
cp -R LICENSES "$stage/"
for dep in zod yaml; do cp -RL "node_modules/$dep" "$stage/node_modules/$dep"; done
ln -s ../tools/dxtrace.mjs "$stage/bin/dxtrace"
chmod +x "$stage/tools/dxtrace.mjs"
mv -T "$stage" "$dest"
echo "Installed DX-TRACE in $dest"
