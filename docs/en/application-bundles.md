# AppKit v2: bundles

## Atomic installation

A bundle groups 1–12 v1 manifests with distinct IDs. Plan returns per-model baseVersions, record counts and rejections. Install checks the exact plan and commits all model changes, receipt and audit in one transaction. A single incompatible model rejects the bundle.

```bash
node tools/dxtrace.mjs bundle-plan examples/bundles/operations.json
```

Offline plan assumes empty state. Online plan considers actual records.

## Full source and translation status

This English edition is a curated guide, not a line-for-line translation. For exact implementation details, see the [canonical source](../../docs/APPLICATION-BUNDLES.md).
