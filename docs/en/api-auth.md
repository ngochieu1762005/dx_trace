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

## Full source and translation status

This English edition is a curated guide, not a line-for-line translation. For exact implementation details, see the [canonical source](../../website/content/api-auth.md).
