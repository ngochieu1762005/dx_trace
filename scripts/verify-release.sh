#!/usr/bin/env bash
# SPDX-License-Identifier: MIT
# SPDX-FileCopyrightText: 2026 DX-TRACE contributors
set -euo pipefail
archive=$(realpath "${1:?Usage: verify-release.sh SOURCE.tar.gz}")
temp=$(mktemp -d)
child=''
trap 'if [[ -n "$child" ]]; then kill "$child" 2>/dev/null || true; wait "$child" 2>/dev/null || true; fi; rm -rf "$temp"' EXIT
mkdir "$temp"/{source,work}
tar -xzf "$archive" --strip-components=1 -C "$temp/source"
bash "$temp/source/scripts/clean-install.sh" "$temp/install"
rm -rf "$temp/source"
cd "$temp/work"
export PATH="$temp/install/bin:$PATH"
export DX_LOCAL_DEMO=1 BIND_ADDRESS=127.0.0.1 PORT=8080 PUBLIC_ORIGIN=http://127.0.0.1:8080 DATA_DIR="$temp/data"
node "$temp/install/selfhost/server.mjs" &
child=$!
for i in {1..80}; do
  kill -0 "$child"
  if curl -fsS "$PUBLIC_ORIGIN/api/health" >/dev/null 2>&1; then break; fi
  sleep .25
done
curl -fsS "$PUBLIC_ORIGIN/" | grep -q '<html'
mkdir sdk-consumer
(cd sdk-consumer && npm install --offline --no-audit --no-fund --ignore-scripts "$temp/install"/sdk/*.tgz && node --input-type=module -e 'import {DXTraceClient} from "@dxtrace/sdk"; if(typeof DXTraceClient !== "function")process.exit(1)')
dxtrace app init maintenance
dxtrace app validate ./maintenance
dxtrace app install ./maintenance
curl -fsS "$PUBLIC_ORIGIN/maintenance" | grep -q 'portal.mjs'
dxtrace app list
sed -i 's/version: 1.0.0/version: 1.1.0/' maintenance/app.yaml
dxtrace app upgrade maintenance
dxtrace app rollback maintenance
dxtrace app uninstall maintenance
test "$(curl -s -o /dev/null -w '%{http_code}' "$PUBLIC_ORIGIN/maintenance")" = 404
kill "$child"
wait "$child" || true
child=''
export DXTRACE_URL=https://offline-verifier.invalid
dxtrace evidence demo --out evidence-demo >/dev/null
dxtrace evidence verify evidence-demo/recall-evidence.tar.gz --public-key evidence-demo/evidence-public.pem
if dxtrace evidence verify evidence-demo/recall-evidence-tampered.tar.gz --public-key evidence-demo/evidence-public.pem; then
  echo "Tampered evidence was incorrectly accepted" >&2
  exit 1
fi
echo "PASS source archive, clean build, installed UI, CLI lifecycle, offline evidence and private data outside source"
sha256sum "$archive"
