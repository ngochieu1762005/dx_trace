# HTTP API overview

## Authentication and areas

All business endpoints live under /api on the application origin. Browser requests use the authenticated session; devices use Bearer credentials. Use area=training for practice reads and writes. Never send internal service tokens from a browser.

## Contracts

[API Reference](api-reference.md) and [API examples](api-examples.md) document the endpoint catalog. Model-specific OpenAPI is generated at /api/models/{id}/openapi. Most business mutations require a stable Idempotency-Key; model writes use a version or baseVersion.

## Full source and translation status

This English edition is a curated guide, not a line-for-line translation. For exact implementation details, see the [canonical source](../../docs/API.md).
