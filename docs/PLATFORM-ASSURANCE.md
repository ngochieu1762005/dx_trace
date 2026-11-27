<!-- SPDX-FileCopyrightText: 2026 DX-TRACE contributors
SPDX-License-Identifier: MIT
DX-TRACE project authors: Đặng Nhật Minh, Nguyễn Ngọc Hiếu
-->
# Platform assurance and metadata catalog

This change adds an optional isolated ClamAV stack and a read-authorized metadata catalog. It does not replace the existing Core database or workflow engine.

## Malware scanning

Generate a unique scanner credential in the untracked selfhost/.env (at least 32 characters). Do not print or commit the value. From selfhost:

```sh
docker compose -f compose.yaml -f compose.ubuntu-edge.yaml -f compose.scanner.yaml config --quiet
docker compose -f compose.yaml -f compose.ubuntu-edge.yaml -f compose.scanner.yaml up -d --build
```

Use the base and scanner files only when the container gateway owns ports 80/443. Keep the same overlays on subsequent operations. ClamAV downloads signatures and may need additional RAM and startup time; size the host first. The image tag is a major/minor tag, not a digest pin. The scan API has no published port. When configured, a clean result is required before writing uploaded bytes; infected files return 422, scanner outage or malformed response returns 503. Without the overlay or an external configured scanner the existing pending/quarantine behavior remains. Previously stored files are not retroactively scanned.

## Metadata and declared field mapping

Authenticated GET /api/catalog lists only models the current role can read in the current workspace. It includes field types, constraints, access metadata, workflow states and declared input/storage/output mappings. It is not observed runtime lineage, row-level data profiling or a cross-tenant catalog.

Offline developer commands (no credentials or server needed):

```sh
node tools/dxtrace.mjs lint examples/maintenance/app.json
node tools/dxtrace.mjs catalog examples/maintenance/app.json
node tools/dxtrace.mjs openapi examples/maintenance/app.json
node --test tests/platform-assurance.test.mjs
```

## Acceptance gates

The tests exercise HTTP verdict handling, authorization, the clamd wire protocol via a fake TCP server and metadata filtering. Real ClamAV signature loading and a clean/blocked upload against an isolated Compose stack must be verified separately before claiming production readiness. Do not send test malware to a public service. SSO end-to-end, PostgreSQL migration, dynamic role provisioning, generic BPMN execution and whole-stack load testing are outside this change.
