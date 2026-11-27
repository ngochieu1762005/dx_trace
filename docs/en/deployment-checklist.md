<!-- SPDX-FileCopyrightText: 2026 DX-TRACE contributors
SPDX-License-Identifier: MIT
DX-TRACE project authors: Đặng Nhật Minh, Nguyễn Ngọc Hiếu
-->
# Deployment checklist

## Before installation

Confirm Linux, Docker Compose v2, Node 24, DNS/TLS, storage capacity and the correct Caddy topology. Generate independent service credentials and keep .env private. For upgrades, take verified backups first.

## Acceptance

Check Compose configuration, internal Core health, real SSO with two accounts, workspace separation, roles, record lifecycle, audit, and recovery. Scanner and external OIDC are optional and require separate tests. Never remove production volumes.

## Check the public route after container startup

Open the landing page in a private window, sign into the warehouse and verify the return destination. Look up a known lot and open Quality Portal with the same account. Record each result separately. A successful Core health check covers that endpoint; the browser round trip also exercises callback, session and workspace access.

## Full source and translation status

This English edition is a curated guide, not a line-for-line translation. For exact implementation details, see the [canonical source](../../website/content/deployment-checklist.md).

On existing standard Ubuntu deployments, use the [operations runbook](operations.md). Host Node is not required. With the Flowable overlay, preserve workflowdata and back up the workflow database; never run the fixture smoke test on production.
