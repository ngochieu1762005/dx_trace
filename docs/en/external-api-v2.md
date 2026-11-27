<!-- SPDX-FileCopyrightText: 2026 DX-TRACE contributors
SPDX-License-Identifier: MIT
DX-TRACE project authors: Đặng Nhật Minh, Nguyễn Ngọc Hiếu
-->
# External API v2
v1 remains read-only and accepts policy version 1. To opt in on isolated staging, use policy version 2:
```json
{"version":2,"clients":[{"clientId":"my-integrator","workspace":"ws-EXAMPLE","models":["pkg_maintenance_maintenance"],"requestsPerMinute":30,"scopes":["dxtrace.records.read","dxtrace.records.create","dxtrace.records.transition"]}]}
```
Provision the user/service account as an existing member before enabling this API; v2 does not accept invitations or create workspaces. Use the exact stored workspace and model IDs. Configure corresponding Keycloak scopes, audience and verified email. Each write needs JSON and a stable Idempotency-Key. Model/tenant permission, actor separation and optimistic version checks remain in Core. The gateway namespaces keys by client and JWT subject. The policy binds the member organization and selects an area, defaulting to live. Set `area` to `training` in the client policy to select the same training area as the portal. The client cannot override either value in a request. Policy v2 applies on both URL versions.

| Method | Route |
|---|---|
| GET | /v2/apps |
| GET | /v2/models/{model}/schema |
| GET/POST | /v2/models/{model}/records |
| GET | /v2/models/{model}/records/{id} |
| POST | /v2/models/{model}/records/{id}/transition |
| GET | /v2/models/{model}/records/{id}/tasks |
| GET | /v2/models/{model}/records/{id}/evidence |

The schema endpoint includes model-derived OpenAPI. The SDK lives in [SDK package](../../sdk/README.en.md). Task projection requires `dxtrace.tasks.read`. Evidence metadata requires `dxtrace.evidence.read` plus owner or manager and returns the latest 100 decisions for this visible record. Full archives contain workspace ledger history and stay in the manager portal. SDK packages can be installed from the release tarball. Replicas on one host can share quotas with the compose.external-quota.yaml overlay and one dedicated SQLite volume. Multi-host replicas require a shared upstream rate limiter.
