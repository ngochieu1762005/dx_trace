# External OIDC API

[External API v2 · SDK, scopes, records, tasks and evidence](external-api-v2.md)

## Optional resource server

The external service is an opt-in integration surface with a configured issuer, audience and operator-maintained client policy. It uses its own gateway path and rejects invalid tokens. It is not the same as the browser cookie session.

## Integrate safely

Follow the canonical configuration for allowed clients, exact resources and read-only policy. Do not reuse internal Core credentials or publish an unrestricted proxy. Test invalid issuer/audience, expiry and unauthorized resources before opening a route.

## Full source and translation status

This English edition is a curated guide, not a line-for-line translation. For exact implementation details, see the [canonical source](../../docs/EXTERNAL-API.md).
