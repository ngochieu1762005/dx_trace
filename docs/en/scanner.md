<!-- SPDX-FileCopyrightText: 2026 DX-TRACE contributors
SPDX-License-Identifier: MIT
DX-TRACE project authors: Đặng Nhật Minh, Nguyễn Ngọc Hiếu
-->
# ClamAV and catalog

## Scanning

Optional scanner overlay connects Core to an authenticated scanning adapter and ClamAV. Uploads remain quarantined when scanning is not configured; reject malware and fail closed on scanner errors. Old pending files are not automatically rescanned.

## Catalog tooling

The CLI validates manifests and produces catalog/OpenAPI metadata. Declared lineage describes input, storage and output mappings; it is not observed end-to-end lineage.

## Full source and translation status

This English edition is a curated guide, not a line-for-line translation. For exact implementation details, see the [canonical source](../../docs/PLATFORM-ASSURANCE.md).
