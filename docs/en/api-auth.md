# API authentication and errors

## Authentication

Browser session endpoints require authorized same-origin credentials. Device ingestion uses a device Bearer token. Optional external OIDC API is separate. Do not put secrets in public docs or URL parameters.

| Status | Meaning |
| --- | --- |
| 200 | Success |
| 400/422 | Invalid command or payload |
| 401/403 | Missing identity or denied access |
| 404 | Missing resource |
| 409 | Stale version or invalid state |
| 413/423 | Size limit or quarantine |
| 429 | Rate limit |
| 502/503 | Dependency unavailable |

Retry the exact same command with its original key. Refresh a stale model or record before attempting a new command.

## Recover from a lost write response

Keep the command key, request body and warehouse area. For an endpoint with idempotency support, retry the same request with the same key. On a 409, reload the record and compare its state, version and history. Finish if the original change is present. If another user updated the record, show their changes before submitting a new decision. Device ingestion instead uses its sample ID as described in the sensor guide.

## Full source and translation status

This English edition is a curated guide, not a line-for-line translation. For exact implementation details, see the [canonical source](../../website/content/api-auth.md).
