# Declarative application bundles (v2)

An application bundle groups up to 12 existing v1 manifests into one transactional workspace operation. It reuses the model validator, workflow engine, version history, permissions and record storage. It does not run code from a manifest. Individual v1 application APIs remain unchanged.

Example: [operations bundle](../examples/bundles/operations.json) installs maintenance and purchase approval together.

## Developer CLI

```sh
node tools/dxtrace.mjs bundle-lint examples/bundles/operations.json
node tools/dxtrace.mjs bundle-plan examples/bundles/operations.json
```

The offline plan assumes an empty workspace. Use the authenticated API for a live plan.

## API

- POST /api/apps/bundle-plan with {"bundle": ...}: owner only, no writes, returns baseVersions, per-model compatibility checks and applicable.
- POST /api/apps/bundle-install with {"bundle": ..., "baseVersions": ...}: owner only, requires Idempotency-Key. All model writes, the command receipt and audit event commit in one transaction; a stale or incompatible model rejects the whole bundle.
- GET /api/apps lists the installed models individually. A bundle is an install operation, not a separate persisted runtime entity.

No cross-model foreign keys, new role provisioning, arbitrary scripts or automatic UI deployment are introduced. Existing records are not migrated by this operation. Model constraints and existing workspace isolation apply unchanged.

The API regression test covers stale plans, no partial writes, two-model updates, role denial, retry and audit verification.
