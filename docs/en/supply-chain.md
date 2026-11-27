<!-- SPDX-FileCopyrightText: 2026 DX-TRACE contributors
SPDX-License-Identifier: MIT
DX-TRACE project authors: Đặng Nhật Minh, Nguyễn Ngọc Hiếu
-->
# SBOM and supply chain

## Release evidence

Build from a known commit/tag, retain the release archive, SHA-256 checksums and SPDX SBOM. CI checks tracked secrets and builds the image. Verify artifacts against their recorded hashes and review dependency licenses.

Passing a scan or SBOM generation is not certification or an independent penetration test.

## Full source and translation status

This English edition is a curated guide, not a line-for-line translation. For exact implementation details, see the [canonical source](../../docs/SUPPLY-CHAIN.md).
