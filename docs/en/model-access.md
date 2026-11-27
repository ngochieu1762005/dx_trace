<!-- SPDX-FileCopyrightText: 2026 DX-TRACE contributors
SPDX-License-Identifier: MIT
DX-TRACE project authors: Đặng Nhật Minh, Nguyễn Ngọc Hiếu
-->
# Model-specific access

## Scope rules

permissions.read determines readable roles; create must be a subset. The legacy scope is all or own, with existing manager access behavior. Optional scopeByRole overrides non-owner roles. Unknown roles and owner overrides are rejected.

The same scope is enforced for SQL listing, totals, profiling, task projection and mutations. Explicit own can prevent a manager from approving another person's record. This is not dynamic Keycloak group provisioning.

## Full source and translation status

This English edition is a curated guide, not a line-for-line translation. For exact implementation details, see the [canonical source](../../docs/MODEL-ACCESS.md).
