# API Reference

## Endpoint catalog

The static reference documents the HTTP endpoints, authentication and constraints. The documentation site does not send API requests.

## Warehouse

| Method and path | Access | Description and constraints |
| --- | --- | --- |
| `GET /api/health` | public | Health only; not SSO readiness. |
| `GET /api/state` | session | Workspace snapshot; abbreviated example. |
| `GET /api/export` | session | JSON attachment; not a full backup. |
| `GET /api/platform` | session | Includes identity, built-in applications and workflow. |
| `GET /api/impact/{lotId}` | session | Use an internal lot ID, not the printed lot code. |
| `GET /api/barcode/{code}` | session | 8–14 digits; external lookup may fail. |
| `POST /api/partners` | writer | kind: supplier or destination; contact/address optional. |
| `POST /api/lots` | writer | Unique code; valid date; positive quantity; min_temp < max_temp. |
| `POST /api/shipments` | writer | Active lot, valid destination and sufficient available stock. |
| `POST /api/shipments/{id}/deliver` | writer | Reserved shipment and active unexpired lot. |
| `POST /api/shipments/{id}/cancel` | writer | Reserved shipments only. |
| `POST /api/shipments/{id}/return` | writer | Approved recall; quantity optional, cannot exceed outstanding amount. |
| `POST /api/incidents` | writer | severity: medium/high/critical; no existing open incident. |
| `POST /api/incidents/{id}/approve` | manager | Pending incident only. |
| `POST /api/incidents/{id}/close` | manager | Approved and all reserved/delivered shipments resolved; lot stays blocked. |
| `POST /api/quality/{id}/escalate` | manager | Rejected quality record, matching lot code, not already linked. |
| `POST /api/workspace` | owner | Name up to 100 characters. |
| `POST /api/workflow` | writer | Content up to 4000 characters. |
| `POST /api/workflow/{id}/transition` | workflow | Allowed target and role depend on workflow. |

## Identity & devices

| Method and path | Access | Description and constraints |
| --- | --- | --- |
| `POST /api/members` | owner | Invite before first login; manager/warehouse/viewer. |
| `POST /api/members/{id}/role` | owner | Cannot change owner; role may be disabled. |
| `POST /api/devices` | manager | Credential returned once; store securely. |
| `POST /api/devices/{id}/revoke` | manager | Disables device credential. |
| `POST /api/ingest` | device | Bearer device credential; time within 10 minutes; same ID and body for retries. |
| `GET /api/sensor-history/{deviceId}` | session | Up to 100 readings per page. |
| `POST /api/documents` | writer | Content up to 20000 characters. |
| `POST /api/assistant` | session | Question 2–2000 chars; optional external LLM; no business writes. |
| `POST /api/files` | writer | Multipart file + entity; PNG/JPEG/PDF up to 5 MiB; quarantine until clean. |
| `GET /api/files/{id}` | session | Binary attachment; 423 when scan is not clean. |

## AppKit & catalog

| Method and path | Access | Description and constraints |
| --- | --- | --- |
| `GET /api/apps` | session | Only readable models. |
| `GET /api/apps/{id}/manifest` | model | Returns AppKit v1 manifest. |
| `POST /api/apps/plan` | owner | Use the complete manifest object, not the filename; read-only plan. |
| `POST /api/apps/install` | owner | Use baseVersion returned by plan. |
| `POST /api/apps/bundle-plan` | owner | Use complete bundle object; plan is read-only. |
| `POST /api/apps/bundle-install` | owner | Use exact baseVersions from plan; no partial writes. |
| `GET /api/catalog` | session | Metadata, declared lineage and access. |
| `GET /api/catalog/{id}/profile` | model | Counts scoped to authorized records; no raw values. |

## Models & workflow

| Method and path | Access | Description and constraints |
| --- | --- | --- |
| `GET /api/models` | session | Optional model, q (max 200), open=1, order=due, limit 1–200. |
| `GET /api/models/{id}/records` | model | Pagination after scope checks. |
| `GET /api/models/{id}/openapi` | model | Generated per-model schema. |
| `GET /api/models/{id}/bpmn` | model | XML finite-state workflow subset. |
| `GET /api/models/{id}/process-bpmn` | model | Requires orchestration. |
| `POST /api/models/plan` | owner | Complete definition; read-only plan. |
| `POST /api/models/apply` | owner | Use exact baseVersion; rejects incompatible updates. |
| `POST /api/models/bpmn/plan` | owner | Model ID must match existing or supplied definition. |
| `POST /api/models/bpmn/apply` | owner | Use plan result and supported subset only. |
| `POST /api/models/{id}/records` | model | Sample data for maintenance model; field validation is model-specific. |
| `POST /api/models/{id}/update` | model | Creator, initial state and matching version. |
| `POST /api/models/{id}/transition` | workflow | Role, guard, reason and differentActor rules apply. |
| `POST /api/models/{id}/process-complete` | workflow | Active task and matching version required. |
| `POST /api/models/{id}/process-tick` | manager | Timer must be due; normal deployments use worker. |

## Audit & metrics

| Method and path | Access | Description and constraints |
| --- | --- | --- |
| `GET /api/audit-ledger` | manager | At most 100 events after sequence cursor. |
| `GET /api/audit-ledger/verify` | manager | Compare external checkpoint for historical verification. |
| `GET /api/audit-ledger/export` | manager | JSON bundle up to 10 MiB. |
| `GET /api/metrics` | manager | Prometheus text; manager/owner only. |

## API conventions

Base: application origin + /api. Session authentication for business resources, Bearer for device ingestion. Business mutations typically require Idempotency-Key and version checks. See [authentication and errors](api-auth.md) and [examples](api-examples.md).

Generated per-model OpenAPI is distinct from this manually curated whole-platform catalog.

## Full source and translation status

This English edition is a curated guide, not a line-for-line translation. For exact implementation details, see the [canonical source](../../website/content/api-reference.md).
