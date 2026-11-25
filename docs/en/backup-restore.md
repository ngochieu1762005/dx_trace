# Backup and restore

## Scope

Back up warehouse SQLite using the repository backup script, content-addressed objects, Keycloak PostgreSQL dump, .env, Compose files and Caddy configuration. Verify integrity and attachment hashes; retain an external audit checkpoint.

## Restore drill

Restore into new volumes with the recorded commit and appropriate ownership. Verify actual accounts, workspace data, files and workflows before switching traffic. Keep a private off-host backup. Never restore over a live database without an approved recovery plan.

## Full source and translation status

This English edition is a curated guide, not a line-for-line translation. For exact implementation details, see the [canonical source](../../website/content/backup-restore.md).
