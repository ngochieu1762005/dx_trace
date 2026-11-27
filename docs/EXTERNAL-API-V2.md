# External API v2 (development, not released)
v1 remains read-only and accepts policy version 1. To opt in on isolated staging, use policy version 2:
```json
{"version":2,"clients":[{"clientId":"my-integrator","workspace":"ws-EXAMPLE","models":["pkg_maintenance_maintenance"],"requestsPerMinute":30,"scopes":["dxtrace.records.read","dxtrace.records.create","dxtrace.records.transition"]}]}
```
Provision the user/service account as an existing member before enabling this API; v2 does not accept invitations or create workspaces. Use the exact stored workspace and model IDs. Configure corresponding Keycloak scopes, audience and verified email. Each write needs JSON and a stable Idempotency-Key. Model/tenant permission, actor separation and optimistic version checks remain in Core. The gateway namespaces keys by client and JWT subject. v2 currently uses the member's base workspace; training/live aliases are not automatically selected.

| Method | Route |
|---|---|
| GET | /v2/apps |
| GET | /v2/models/{model}/schema |
| GET/POST | /v2/models/{model}/records |
| GET | /v2/models/{model}/records/{id} |
| POST | /v2/models/{model}/records/{id}/transition |

The schema endpoint includes model-derived OpenAPI. The SDK lives in [sdk](../sdk/README.md). No arbitrary proxying, core credentials, task API or Evidence archive exposure. Evidence archives currently include a ledger prefix and require a separate disclosure design before allowing external clients to export them. Do not deploy publicly before end-to-end Keycloak and tenant isolation tests on staging. No external API v2 claims apply to v0.1.0.
