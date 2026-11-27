#!/usr/bin/env bash
# SPDX-FileCopyrightText: 2026 DX-TRACE contributors
# SPDX-License-Identifier: MIT
# DX-TRACE project authors: Đặng Nhật Minh, Nguyễn Ngọc Hiếu
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

echo "Verify an independent copy of the warehouse snapshot (no network)"
docker run --rm --network none --read-only \
  --mount "type=bind,src=$ROOT,dst=/source,readonly" \
  --mount "type=bind,src=$TMP/warehouse,dst=/restored,readonly" \
  --workdir /source node:24-alpine \
  node selfhost/verify-backup.mjs /restored

echo "Restore database dumps into temporary isolated PostgreSQL 17 (no network)"
docker run --rm -i --network none --read-only --memory=1024m \
  --tmpfs /tmp:rw,mode=1777,size=768m \
  --mount "type=bind,src=$BACKUP,dst=/backup,readonly" \
  --entrypoint sh postgres:17-alpine -s <<'RESTORE_CONTAINER'
set -eu
mkdir -p /tmp/identity-db
chown -R postgres:postgres /tmp/identity-db
su postgres -s /bin/sh -c "initdb -D /tmp/identity-db -A trust --no-instructions >/dev/null"
su postgres -s /bin/sh -c "pg_ctl -D /tmp/identity-db -o '-c listen_addresses= -c unix_socket_directories=/tmp' -w start >/dev/null"
cleanup() { su postgres -s /bin/sh -c "pg_ctl -D /tmp/identity-db -m immediate stop >/dev/null 2>&1" || true; }
trap cleanup EXIT
for name in keycloak flowable; do
 if [ "$name" = flowable ] && [ ! -f /backup/flowable.dump ]; then continue; fi
 test -s "/backup/$name.dump"
 cp "/backup/$name.dump" /tmp/source.dump
 chown postgres:postgres /tmp/source.dump
 su postgres -s /bin/sh -c "createdb -h /tmp $name"
 su postgres -s /bin/sh -c "pg_restore -h /tmp --exit-on-error --no-owner --no-privileges -d $name /tmp/source.dump"
 case "$name" in
  keycloak) table=realm ;;
  flowable) table=act_re_procdef ;;
 esac
 su postgres -s /bin/sh -c "psql -h /tmp -v ON_ERROR_STOP=1 -d $name -c 'SELECT count(*) FROM $table'" >/dev/null
 echo "PASS $name schema restored"
done
RESTORE_CONTAINER
echo "PASS isolated restore drill: warehouse integrity and supplied database dumps verified."
echo "NOTE: Browser login, domain callbacks and historical business content still require human acceptance tests."
