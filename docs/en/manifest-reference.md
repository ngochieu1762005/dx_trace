# Manifest reference

## v1 application

apiVersion dxtrace.io/v1; kind DeclarativeApplication; metadata id/name/version; spec.model defines fields, permissions and workflow. Optional uiPath must reference a trusted, separately deployed same-origin app.

Fields: text, number, boolean, date, choice. Supports required, numeric bounds, text length and requiredWhen. Read/create roles and all/own scope determine access. Workflow declares states, initial, terminal and transitions with role checks and optional guards.

## v2 bundle

apiVersion dxtrace.io/v2; kind ApplicationBundle; spec.applications contains 1–12 unique v1 manifests. Use baseVersions from plan. No remote scripts or cross-model foreign keys.

[Example manifest](../../examples/maintenance/app.json) · [Example bundle](../../examples/bundles/operations.json).

## Full source and translation status

This English edition is a curated guide, not a line-for-line translation. For exact implementation details, see the [canonical source](../../website/content/manifest-reference.md).
