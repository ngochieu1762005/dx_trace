#!/usr/bin/env bash
# SPDX-License-Identifier: MIT
# Existing standard Ubuntu deployment; no volume deletion or Caddy edits.
set -euo pipefail
umask 077
cd "$(dirname "$0")/.."
ROOT=$(pwd)
FLOW=0
case "$#:$*" in
  0:) ;;
  1:--with-flowable) FLOW=1 ;;
  *) echo "Usage: bash selfhost/scripts/update-ubuntu.sh [--with-flowable]" >&2; exit 2 ;;
esac
test -s .env
command -v openssl >/dev/null
command -v docker >/dev/null
python3 -m venv --help >/dev/null
test -f /etc/caddy/Caddyfile
test -f /srv/dx-trace/landing/index.html
# Discover the current project via the existing Core, not a new volume namespace.
CORE=$(docker ps -q --filter label=com.docker.compose.service=core --filter "label=com.docker.compose.project.working_dir=$ROOT")
[[ -n "$CORE" && "$CORE" != *$'\n'* ]] || { echo "Expected exactly one running Core in $ROOT"; exit 1; }
PROJECT=$(docker inspect -f '{{index .Config.Labels "com.docker.compose.project"}}' "$CORE")
CONFIG=$(docker inspect -f '{{index .Config.Labels "com.docker.compose.project.config_files"}}' "$CORE")
case "$CONFIG" in
 "$ROOT/compose.yaml,$ROOT/compose.ubuntu-edge.yaml") ;;
 "$ROOT/compose.yaml,$ROOT/compose.ubuntu-edge.yaml,$ROOT/compose.third-party.yaml") FLOW=1 ;;
 *) echo "Custom Compose files detected; use a reviewed manual upgrade"; exit 1 ;;
esac
old() { docker compose -p "$PROJECT" -f compose.yaml -f compose.ubuntu-edge.yaml "$@"; }
if [[ "$CONFIG" == *compose.third-party.yaml ]]; then
 old() { docker compose -p "$PROJECT" -f compose.yaml -f compose.ubuntu-edge.yaml -f compose.third-party.yaml "$@"; }
fi
BACKUP="/opt/dx-trace-backups/$(date -u +%Y%m%dT%H%M%SZ)-$$"
mkdir -m 700 -p "$BACKUP"
git rev-parse HEAD > "$BACKUP/target-commit.txt"
docker inspect -f '{{.Image}}' "$CORE" > "$BACKUP/previous-core-image.txt"
cp -a .env compose*.yaml "$BACKUP/"
cp -a /etc/caddy/Caddyfile "$BACKUP/"
for KEY in DX_GATEWAY_APP_TOKEN; do
 if ! grep -q "^$KEY=" .env; then printf '%s=%s\n' "$KEY" "$(openssl rand -hex 32)" >> .env; fi
done
if (( FLOW )); then
 for KEY in DX_FLOWABLE_DB_PASSWORD DX_FLOWABLE_API_PASSWORD; do
  if ! grep -q "^$KEY=" .env; then
   [[ "$CONFIG" != *compose.third-party.yaml ]] || { echo "Missing existing Flowable credential; restore .env"; exit 1; }
   printf '%s=%s\n' "$KEY" "$(openssl rand -hex 32)" >> .env
  fi
 done
fi
chmod 600 .env
new() { docker compose -p "$PROJECT" -f compose.yaml -f compose.ubuntu-edge.yaml "$@"; }
if (( FLOW )); then
 new() { docker compose -p "$PROJECT" -f compose.yaml -f compose.ubuntu-edge.yaml -f compose.third-party.yaml "$@"; }
fi
new config --quiet
new pull gateway-api
if (( FLOW )); then new pull flowable workflow-db; fi
new build core app quality-portal
if [[ -n "$(docker ps -q --filter "label=com.docker.compose.project=$PROJECT" --filter label=com.docker.compose.service=external-api)" ]]; then
 echo "Pause external-api before upgrade"; exit 1
fi
old stop app
trap 'echo "Upgrade interrupted; backup directory: $BACKUP. Inspect service state before resuming traffic." >&2' ERR
SNAP="/tmp/warehouse-upgrade-$$"
old exec -T -e DATA_DIR=/app/data core node selfhost/backup.mjs "$SNAP"
old exec -T core node selfhost/verify-backup.mjs "$SNAP"
docker cp "$CORE:$SNAP" "$BACKUP/warehouse"
old exec -T core rm -rf "$SNAP"
old exec -T identitydb pg_dump -U keycloak -d identity -Fc > "$BACKUP/keycloak.dump"
test -f "$BACKUP/warehouse/COMPLETE"
test -s "$BACKUP/keycloak.dump"
if [[ "$CONFIG" == *compose.third-party.yaml ]]; then
 old exec -T workflow-db pg_dump -U flowable -d flowable -Fc > "$BACKUP/flowable.dump"
 test -s "$BACKUP/flowable.dump"
fi
if (( FLOW )); then new up -d flowable; fi
new up -d core gateway-api quality-portal app
new exec -T app node --input-type=module -e '
for(let i=0;i<45;i++){
 try {
  const r=await fetch(process.env.DX_CORE_URL+"/api/health",{headers:{"x-dx-core-token":process.env.DX_CORE_TOKEN},signal:AbortSignal.timeout(3000)});
  if(r.ok&&(await r.json()).database===true){console.log("PASS APISIX -> Core");process.exit(0);}
 }catch{}
 await new Promise(r=>setTimeout(r,2000));
}
process.exit(1);
'
new ps
cd ..
bash website/deploy-vps.sh
caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
echo "Upgrade finished; backup: $BACKUP"
echo "Verify real SSO, warehouse records and Flowable review in a test workspace."
