<!-- SPDX-FileCopyrightText: 2026 DX-TRACE contributors
SPDX-License-Identifier: MIT
DX-TRACE project authors: Đặng Nhật Minh, Nguyễn Ngọc Hiếu
-->
# Dependencies

## Main components

Node.js 24, pnpm, React, Vite, Zod, QR/barcode libraries, SQLite, Docker Compose, Keycloak, OAuth2 Proxy and Caddy. Apache APISIX 3.21.0 is the default gateway; optional Flowable OSS 7.2.0 uses a separate PostgreSQL database. Both upstream projects use Apache-2.0. PostgreSQL also serves identity; optional scanner uses ClamAV. Docs use Python markdown-it-py and custom HTML/CSS/JS.

Use package.json, the lockfile, dependency notices and release SBOM for exact versions and licenses.

## Full source and translation status

This English edition is a curated guide, not a line-for-line translation. For exact implementation details, see the [canonical source](../../docs/DEPENDENCIES.md).
