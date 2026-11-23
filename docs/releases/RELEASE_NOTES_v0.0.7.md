# DX-TRACE v0.0.7 — Parallel Workflow & External OIDC API

**Release date:** 23 November 2026  
**Source:** MIT · Node.js 24 · pnpm 11.25.0 · Docker Compose  
**Scope:** Source-code release with CI evidence; production VPS acceptance is a separate activity.

This release strengthens DX-TRACE as an **open-core DX-OS platform** while preserving existing warehouse, AppKit and Quality Portal behavior.

## Highlights

### 1. Executable parallel workflow and BPMN export

- Added a durable **parallel fork/join process runtime**: multiple human tasks can run in parallel and the process waits for all branches before finishing.
- Human task completion enforces **workspace identity, roles, different-actor approval, required reasons, optimistic record versions and idempotent commands**.
- Added **persistent relative timers** and a bounded Core timer worker. Timer deadlines survive process restarts.
- Added **BPMN 2.0 XML export** with diverging/converging `parallelGateway` and `timerEventDefinition` for supported process graphs.
- Added a concrete parallel maintenance/quality process example and integration tests.

**Supported subset, not a full BPMN 2.0 engine:** one structured fork/join pair, limited DAG nodes, user tasks, intermediate timers, and end. Arbitrary BPMN XML import, nested gateways, service-task scripting and drag-and-drop authoring are **not** supported.

### 2. Network-isolated internal API Gateway

- Introduced dedicated App → Gateway → Core routing and separate application/Core credentials.
- Docker networks separate the browser-facing application from private Core; API Gateway bridges only the required private networks.
- Request authentication, limited forwarded headers, request/response caps, redirect refusal, basic per-process rate limiting, and Docker isolation smoke tests.
- Existing browser sign-in continues through Keycloak and OAuth2 Proxy.

**Upgrade requirement:** existing installations must add a strong, independent `DX_GATEWAY_APP_TOKEN` to `selfhost/.env` before starting the new stack. Do not regenerate other secrets or reset volumes.

### 3. Optional external Keycloak OIDC API

- Added a **separate resource server**, disabled by default using the `external-api` Docker Compose profile.
- Validates RS256-signed Keycloak access tokens with exact HTTPS issuer, audience, read scope, verified email, client allowlist and model-level ACL.
- Offers a **versioned, read-only** `GET /v1/models/{model}/records` integration endpoint with per-client quota and sanitized audit records.
- The Ubuntu host-Caddy overlay binds its optional listener to **127.0.0.1 only**. No public route is created automatically.

**Not claimed:** a public API marketplace, self-service OAuth client management, distributed quotas or a write-capable external API.

### 4. Test, supply-chain and reproducibility improvements

- CI verifies code build, Node.js/Python regressions, Docker isolation and reproducible **SPDX 2.3 SBOM** generation.
- New test cases cover signed OIDC tokens, authorization, rate limiting, process-timer persistence, parallel approval, BPMN export and client-scoped access.
- Added **read-only HTTPS latency tool**, real two-user Keycloak acceptance checker and a **network-isolated restore drill** for warehouse SQLite/object snapshots and Keycloak PostgreSQL dumps.
- Release assets include source `.tar.gz` and `.zip`, `SHA256SUMS` and `DX-TRACE.spdx.json`; the release workflow creates provenance/SBOM attestations for the source archive.

CI **does not** establish that an external Keycloak client is configured correctly, that a VPS has been updated, or that production backup/restore and real SSO have been validated.

## Upgrade from v0.0.6

1. **Back up** current warehouse, Keycloak PostgreSQL, `selfhost/.env`, Docker Compose and the existing host Caddy configuration following [Operations](https://github.com/ngochieu1762005/dx_trace/blob/v0.0.7/selfhost/OPERATIONS.md).
2. Read [Gateway and SSO migration](https://github.com/ngochieu1762005/dx_trace/blob/v0.0.7/docs/GATEWAY-AND-SSO.md). On an existing server, generate `DX_GATEWAY_APP_TOKEN` separately if absent; do **not** rerun the initial setup or remove named volumes.
3. Use the same two Compose files already installed. For the Ubuntu VPS with Caddy running on the host, use **`compose.yaml` + `compose.ubuntu-edge.yaml`**, and build the `core`, `gateway-api`, `quality-portal`, and `app` services.
4. Keep the `external-api` profile **disabled** unless a real Keycloak client, audience mapping and on-disk client allowlist have been configured and tested.
5. Verify Core/App/Quality Portal, both warehouse environments, login, roles, old workflow data, API status and Caddy websites after deployment. Perform staging checks before enabling new orchestration models.

**Never use `docker compose down -v`** as an upgrade command, and do not overwrite the host-wide `/etc/caddy/Caddyfile`.

## Evidence and limitations

- [Architecture and technical evidence](https://github.com/ngochieu1762005/dx_trace/blob/v0.0.7/docs/EVIDENCE.md)
- [Parallel process semantics](https://github.com/ngochieu1762005/dx_trace/blob/v0.0.7/docs/PROCESS-RUNTIME.md)
- [External API and OIDC setup](https://github.com/ngochieu1762005/dx_trace/blob/v0.0.7/docs/EXTERNAL-API.md)
- [Live acceptance checklist](https://github.com/ngochieu1762005/dx_trace/blob/v0.0.7/docs/ACCEPTANCE-2026.md)
- [Changes from v0.0.6](https://github.com/ngochieu1762005/dx_trace/compare/v0.0.6...v0.0.7)
- [Release source and checksums](https://github.com/ngochieu1762005/dx_trace/releases/tag/v0.0.7)

The published source SHA, SPDX inventory and checksum manifest must be validated by the tagged release workflow before this release is considered complete.

This is a **code release**, not certification of production HA, comprehensive BPMN coverage, clinical/security compliance, independently audited security or actual deployed VPS availability. Live Keycloak SSO, staging restore and TLS load measurements remain separate acceptance tasks.

© 2026 DX-TRACE contributors. Licensed under MIT.
