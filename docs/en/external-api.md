<!-- SPDX-FileCopyrightText: 2026 DX-TRACE contributors
SPDX-License-Identifier: MIT
DX-TRACE project authors: Đặng Nhật Minh, Nguyễn Ngọc Hiếu
-->
# External OIDC API

[External API v2 · SDK, scopes, records, tasks and evidence](external-api-v2.md)

## Optional resource server

The external service is an opt-in integration surface with a configured issuer, audience and operator-maintained client policy. It uses its own gateway path and rejects invalid tokens. It is not the same as the browser cookie session.

## Integrate safely

Follow the canonical configuration for allowed clients, exact resources and read-only policy. Do not reuse internal Core credentials or publish an unrestricted proxy. Test invalid issuer/audience, expiry and unauthorized resources before opening a route.

For scoped writes, tasks and evidence queries in v0.2.0, see [External API v2 and SDK](external-api-v2.md).

## Full source and translation status

This English edition is a curated guide, not a line-for-line translation. For exact implementation details, see the [canonical source](../../docs/EXTERNAL-API.md).
