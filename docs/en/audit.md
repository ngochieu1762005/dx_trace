# Audit evidence

## Verify

The ledger links event payloads with SHA-256 and a previous hash. Manager/owner can verify and export a bundle. Keep the head or checkpoint outside the database to detect rewritten history against that reference.

An internally consistent ledger alone is not proof against an administrator rewriting all events. Do not publish evidence containing real user or warehouse details.

## Full source and translation status

This English edition is a curated guide, not a line-for-line translation. For exact implementation details, see the [canonical source](../../docs/AUDIT-EVIDENCE.md).
