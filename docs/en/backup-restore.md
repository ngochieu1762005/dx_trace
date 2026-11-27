<!-- SPDX-FileCopyrightText: 2026 DX-TRACE contributors
SPDX-License-Identifier: MIT
DX-TRACE project authors: Đặng Nhật Minh, Nguyễn Ngọc Hiếu
-->
# Backup and restore

## Scope

Back up warehouse SQLite using the repository backup script, content-addressed objects, Keycloak PostgreSQL dump, .env, Compose files and Caddy configuration. Verify integrity and attachment hashes; retain an external audit checkpoint.

## Restore drill

Restore into new volumes with the recorded commit and appropriate ownership. Verify actual accounts, workspace data, files and workflows before switching traffic. Keep a private off-host backup. Never restore over a live database without an approved recovery plan.

## Spot-check a restored workspace

Before backup, record an active lot ID, a delivered shipment and an open case. Select an attachment if the workspace has one. In the separate restored environment, sign into the same workspace, locate those records and compare destination, quantity, state and history. Open the attachment and compare its checksum with the backup.

Record when the warehouse and identity backups were taken. If records are present but the user cannot sign in, check the Keycloak restore and callback route before investigating missing warehouse data.

## Full source and translation status

This English edition is a curated guide, not a line-for-line translation. For exact implementation details, see the [canonical source](../../website/content/backup-restore.md).
