# Data governance

## Validation

Text fields can have minimum/maximum lengths; requiredWhen references another field and an equality condition. Server and generated form enforce the rule. Preview checks existing data before applying tighter constraints.

## Profile and catalog

GET /api/catalog lists readable model metadata and declared lineage. GET /api/catalog/{id}/profile counts present/missing fields and latest update within authorized record scope. It does not expose raw values or prove data correctness.

## Full source and translation status

This English edition is a curated guide, not a line-for-line translation. For exact implementation details, see the [canonical source](../../docs/MODEL-GOVERNANCE.md).
