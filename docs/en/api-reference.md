# API Reference

## Interactive endpoint explorer

The bilingual explorer lists the documented HTTP endpoints, with authentication, example request bodies, query and path parameters, response examples, and generated cURL, JavaScript and Python snippets. Example responses are illustrative, not live results.

The live console runs only on the authenticated application origin. It is restricted to selected GET endpoints and always uses the training area. POST requests are generated as code, never executed by the public docs.

## API conventions

Base: application origin + /api. Session authentication for business resources, Bearer for device ingestion. Business mutations typically require Idempotency-Key and version checks. See [authentication and errors](api-auth.md) and [examples](api-examples.md).

Generated per-model OpenAPI is distinct from this manually curated whole-platform catalog.

## Full source and translation status

This English edition is a curated guide, not a line-for-line translation. For exact implementation details, see the [canonical source](../../website/content/api-reference.md).
