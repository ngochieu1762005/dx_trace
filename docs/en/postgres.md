<!-- SPDX-FileCopyrightText: 2026 DX-TRACE contributors
SPDX-License-Identifier: MIT
DX-TRACE project authors: Đặng Nhật Minh, Nguyễn Ngọc Hiếu
-->
# PostgreSQL migration

## Offline rehearsal

```bash
node tools/export-postgres.mjs /private/backup /private/export.sql
psql -X -v ON_ERROR_STOP=1 -f /private/export.sql
```

Use a completed verified backup and isolated PostgreSQL 17 database. The script creates dxtrace_import and verifies per-table counts and digests in a transaction. Never upload the export: it contains private data. Objects remain in the backup.

Core is still SQLite; this is not a production cutover.

## Full source and translation status

This English edition is a curated guide, not a line-for-line translation. For exact implementation details, see the [canonical source](../../docs/POSTGRES-MIGRATION.md).
