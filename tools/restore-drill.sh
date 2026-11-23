#!/usr/bin/env bash
# DX-TRACE | Isolated restore drill: SQLite objects + Keycloak PostgreSQL.
# SPDX-License-Identifier: MIT. Copyright (c) 2026 DX-TRACE contributors.
# Usage: bash tools/restore-drill.sh /opt/dx-trace-backups/YYYYMMDD-HHMMSS
set -Eeuo pipefail
if [ "$#" -ne 1 ]; then
  echo "Usage: bash tools/restore-drill.sh /absolute/backup/directory" >&2
  exit 2
fi
command -v docker >/dev/null || { echo "Docker is required" >&2; exit 1; }
BACKUP="$(realpath "$1")"
test -d "$BACKUP/warehouse"
test -s "$BACKUP/warehouse/warehouse.sqlite"
test -f "$BACKUP/warehouse/COMPLETE"
test -s "$BACKUP/keycloak.dump"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
test -f "$ROOT/selfhost/verify-backup.mjs"
TMP="$(mktemp -d /tmp/dxtrace-restore-XXXXXXXX)"
trap 'rm -rf "$TMP"' EXIT
umask 077
mkdir -p "$TMP/warehouse"
cp -a "$BACKUP/warehouse/." "$TMP/warehouse/"

echo "1/2: Verify an independent copy of the warehouse snapshot (no network)"
docker run --rm --network none --read-only \
  --mount "type=bind,src=$ROOT,dst=/source,readonly" \
  --mount "type=bind,src=$TMP/warehouse,dst=/restored,readonly" \
  --workdir /source node:24-alpine \
  node selfhost/verify-backup.mjs /restored

echo "2/2: Restore Keycloak dump into temporary isolated PostgreSQL 17 (no network)"
docker run --rm -i --network none --read-only --memory=1024m \
  --tmpfs /tmp:rw,mode=1777,size=768m \
  --mount "type=bind,src=$BACKUP,dst=/backup,readonly" \
  --entrypoint sh postgres:17-alpine -s <<'RESTORE_CONTAINER'
set -eu
cp /backup/keycloak.dump /tmp/identity.dump
mkdir -p /tmp/identity-db
chown -R postgres:postgres /tmp/identity-db /tmp/identity.dump
su postgres -s /bin/sh -c "initdb -D /tmp/identity-db -A trust --no-instructions >/dev/null"
su postgres -s /bin/sh -c "pg_ctl -D /tmp/identity-db -o '-c listen_addresses= -c unix_socket_directories=/tmp' -w start >/dev/null"
cleanup() { su postgres -s /bin/sh -c "pg_ctl -D /tmp/identity-db -m immediate stop >/dev/null 2>&1" || true; }
trap cleanup EXIT
su postgres -s /bin/sh -c "createdb -h /tmp identity"
su postgres -s /bin/sh -c "pg_restore -h /tmp --exit-on-error --no-owner --no-privileges -d identity /tmp/identity.dump"
tables="$(su postgres -s /bin/sh -c "psql -h /tmp -d identity -Atc \"SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public'\"")"
test "$tables" -gt 0
echo "PASS Keycloak dump restored; table count: $tables"
RESTORE_CONTAINER
echo "PASS isolated restore drill: warehouse integrity and Keycloak schema restored."
echo "NOTE: Browser login, domain callbacks and historical business content still require human acceptance tests."
