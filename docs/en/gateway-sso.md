<!-- SPDX-FileCopyrightText: 2026 DX-TRACE contributors
SPDX-License-Identifier: MIT
DX-TRACE project authors: Đặng Nhật Minh, Nguyễn Ngọc Hiếu
-->
# Gateway and SSO

## Trust boundary

Keycloak issues identity, OAuth2 Proxy handles the authenticated session and the App forwards trusted identity through the internal gateway. Use separate random App/Gateway and Gateway/Core credentials; never expose them in browser code. Core must not have a public port.

## Live verification

Use two actual accounts in the same workspace, verify issuer/callback, sign-in and expiry, read/write denial and the shared Quality Portal. A 200 health response or a 302 redirect alone does not prove SSO.

## Full source and translation status

This English edition is a curated guide, not a line-for-line translation. For exact implementation details, see the [canonical source](../../docs/GATEWAY-AND-SSO.md).
