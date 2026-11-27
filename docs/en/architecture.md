<!-- SPDX-FileCopyrightText: 2026 DX-TRACE contributors
SPDX-License-Identifier: MIT
DX-TRACE project authors: Đặng Nhật Minh, Nguyễn Ngọc Hiếu
-->
# Headless Core

## Separation

The production web process is presentation-only; Core serves business APIs on a private network and holds the warehouse volume. Quality Portal is independently deployed and communicates through the shared API/session. Stopping that frontend should not stop the Core.

## Limits

The model engine is declarative, not arbitrary executable code. Storage is single-node SQLite and filesystem objects. No claim of horizontal HA follows from service separation.

See [gateway](gateway-sso.md) and [source map](codebase.md).

## Full source and translation status

This English edition is a curated guide, not a line-for-line translation. For exact implementation details, see the [canonical source](../../docs/HEADLESS-CORE.md).
