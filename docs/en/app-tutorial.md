# Tutorial: build an application

## Validate a manifest

```bash
node tools/dxtrace.mjs lint examples/maintenance/app.json
node tools/dxtrace.mjs openapi examples/maintenance/app.json
node tools/dxtrace.mjs catalog examples/maintenance/app.json
```

## Plan and install

As owner in training, select the maintenance manifest in AppKit, review plan rejections and baseVersion, then install. Create a record with equipment, description and priority; submit and have a different authorized reviewer approve where required.

## Evolve safely

Add an optional field, preview again and apply the exact new plan. Incompatible changes with existing data are rejected. Use [bundles](application-bundles.md) for multiple models.

## Full source and translation status

This English edition is a curated guide, not a line-for-line translation. For exact implementation details, see the [canonical source](../../website/content/app-tutorial.md).
