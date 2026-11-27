<!-- SPDX-FileCopyrightText: 2026 DX-TRACE contributors
SPDX-License-Identifier: MIT
DX-TRACE project authors: Đặng Nhật Minh, Nguyễn Ngọc Hiếu
-->
# DX-TRACE system architecture

**Release v0.2.0:** Apache APISIX 3.21.0 is the default Compose gateway. Optional Flowable OSS 7.2.0 executes an independent review process; existing warehouse and AppKit workflows keep their legacy runtime. The [v0.2.0 integration job](https://github.com/ngochieu1762005/dx_trace/actions/runs/45970871898/job/140410713418) passed; production acceptance remains separate. [Integration](third-party-core-migration.md).

![Deployment architecture with browser, sensor and integration routes](../../docs/assets/architecture-current-en.svg)

The diagram describes the Compose deployment on `main`. Base Compose runs Caddy as a container. The Ubuntu override uses the host Caddy and loopback bindings for the application and identity entry points. The product and documentation sites are static files served by the host. [Base Compose](../../selfhost/compose.yaml) · [Ubuntu override](../../selfhost/compose.ubuntu-edge.yaml)

## Request paths

| Entry point | Service path | Identity or policy |
| --- | --- | --- |
| Warehouse UI | Caddy → OAuth2 Proxy → App → API gateway → Core | Keycloak OIDC session. Core enforces warehouse scope, role and operation permissions. |
| Quality Portal | App retrieves static files from `quality-portal:8090`. The browser calls the same-origin `/api`. | Existing warehouse session and Core permissions for inspections, review and quarantine. |
| `POST /api/ingest` | Caddy → App → API gateway → Core | Core validates the device Bearer credential and resolves the warehouse. |
| External API | Operator-configured HTTPS route → `external-api:8093` → API gateway → Core | Optional Keycloak JWT resource server with client and model policies for read access. |
| Identity host | Caddy → Keycloak | Realm `warehouse` and its OIDC endpoints. |

The App shares `appnet` with the API gateway, and the gateway shares `privcore` with Core. The gateway replaces the application credential with its separate Core credential before forwarding. The Ubuntu configuration publishes OAuth2 Proxy on loopback 8180, Keycloak on 8181 and the App device ingress on 8182. The optional external API binds loopback 8183. Gateway and Core have no published host ports in the standard configuration.

## Data and background work

Optional Flowable uses private `coreworkflow` and `workflowdb` networks and a separate PostgreSQL volume `workflowdata`. No engine port is published. Cold telemetry export is workspace/month scoped, gzip JSON Lines and SHA-256 verified; it does not purge source data. [Native review](native-review.md) · [DX-OS governance](dxos-governance.md).

| Storage | Owner | Contents |
| --- | --- | --- |
| PostgreSQL, `identitydata` | Keycloak, via `dbnet` | Users, realm configuration and identity data |
| SQLite WAL, `warehouse.sqlite` | Core, via the `warehouse` volume | Warehouse state, device readings, audit events, AppKit records and commands |
| `objects/<workspace>/<sha256>` | Core, in the same `warehouse` volume | Attachment bytes, with file metadata and scan status tracked by warehouse |

The Core process executes warehouse rules, AppKit transitions and persisted timers. A failed inspection can be linked to a quarantine incident by an authorised manager. The webhook worker uses the audit ledger and sends signed events when configured. Keep the Core and identity backups together for recovery. [Operating workflows](operating-workflows.md) · [Backup and restore](backup-restore.md) · [Audit verification](audit.md)

## Integration boundaries

- The browser decodes camera QR and barcodes. Core can look up product metadata via Open Food Facts and cache the result in SQLite.
- The optional file scanner connects Core to `scan-api` and ClamAV. Files are downloadable after a clean result.
- The assistant searches warehouse documents by default. With a Core API key configured, it can send the query, operational statistics, alerts and matching excerpts to Groq.
- Local demo mode uses a loopback server and a synthetic account. Use the Docker deployment for separate services and an identity provider. The PostgreSQL migration test exercises offline export and import of business data.

[API reference](api-reference.md) · [Acceptance](acceptance.md) · [Vietnamese architecture reference](../../website/content/architecture-map.md)

## Trace a record across both applications

Open a lot in the warehouse, select the same lot in Quality Portal and retain the inspection ID on submission. After a failed review and the quarantine action, return to the warehouse and match the incident to the original lot. This exercises both interfaces and their shared Core data. Test the optional Flowable engine separately using its independent review process.
