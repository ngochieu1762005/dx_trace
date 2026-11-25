# DX-TRACE system architecture

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
