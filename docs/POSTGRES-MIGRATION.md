# PostgreSQL migration readiness

The current runtime remains SQLite. This tool prepares a verified, transactional import of all 11 application tables into PostgreSQL 17, not Keycloak's database. It is an offline migration rehearsal, not a production cutover or an asynchronous replication mechanism.

1. Produce a consistent backup using the existing backup and verification tools.
2. Run `node tools/export-postgres.mjs /private/backup /private/new-export.sql` on Node 24. The destination must not exist and is created with mode 0600. It contains private data, including stored device key hashes, and must not be committed or uploaded.
3. In an isolated PostgreSQL database with UTF-8 encoding, use `psql -X -v ON_ERROR_STOP=1 -f /private/new-export.sql`. The script creates a new schema named dxtrace_import, never drops an existing schema, verifies every table's row count and deterministic SHA-256 digest, and commits only after verification. Any error rolls back the transaction. PostgreSQL BIGINT preserves millisecond timestamps. Text is encoded as hex and decoded by PostgreSQL to avoid SQL quoting ambiguity.
4. Retain the original backup and object files. Objects are validated against their stored checksums but remain on disk; this is not an object-storage migration. Keycloak identity, proxy configuration and secrets must be backed up separately.

The exporter validates SQLite integrity, attachment hashes and audit chains. It rejects legacy embedded model data and schema mismatches. It requires memory proportional to row-count hashes and is intended for a bounded maintenance window. The source remains read-only.

CI uses a disposable real PostgreSQL 17 container to import a synthetic fixture, verify UTF-8 and 64-bit timestamps, and check rollback on corruption and repeat import. It is not a live production database test.

Remaining work: a PostgreSQL query adapter, concurrent transaction/locking semantics, runtime integration and parity tests, backup/restore on PostgreSQL, then a measured cutover. Do not point the current application at the import schema.
