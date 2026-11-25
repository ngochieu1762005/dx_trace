# Operations and recovery

## Upgrade

Record current commit, preserve .env and Compose files, back up warehouse SQLite/files and Keycloak separately, then pull fast-forward only. Build Core, Gateway, Quality Portal and App with the same Compose project and overrides.

## Verify

Inspect container health/logs and authenticated data. Do not run down -v, reset volumes or rerun setup. Restore into a separate environment first; changing an image does not reverse a data migration.

## Full source and translation status

This English edition is a curated guide, not a line-for-line translation. For exact implementation details, see the [canonical source](../../selfhost/OPERATIONS.md).
