# Operations and recovery

## Upgrade

Record current commit, preserve .env and Compose files, back up warehouse SQLite/files and Keycloak separately, then pull fast-forward only. Pull Apache APISIX and build Core, Quality Portal and App with the same Compose project and overrides. On a standard Ubuntu host, use `bash selfhost/scripts/update-ubuntu.sh --with-flowable` after a fast-forward pull; omit the option for APISIX-only unless Flowable is already active. No host Node is required. Preserve additional overrides and back up the workflow database if already enabled. Install python3-venv for docs.

## Verify

Inspect container health/logs and authenticated data. Do not run down -v, reset volumes or rerun setup. Restore into a separate environment first; changing an image does not reverse a data migration.

## Full source and translation status

This English edition is a curated guide, not a line-for-line translation. For exact implementation details, see the [canonical source](../../selfhost/OPERATIONS.md).
