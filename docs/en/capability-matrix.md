# Capability matrix

| Capability | Evidence | Boundary |
| --- | --- | --- |
| Headless Core | [Architecture](architecture.md) | Single-node storage |
| Identity | [Gateway](gateway-sso.md) | Real SSO acceptance separate |
| AppKit | [Bundles](application-bundles.md) | No arbitrary code or cross-model FK |
| Workflow | [Runtime](process-runtime.md) | Supported subset |
| Governance | [Model governance](model-governance.md) | Declared lineage |
| PostgreSQL | [Migration](postgres.md) | Offline import only |
| Audit | [Audit](audit.md) | External checkpoint required |
| Supply chain | [SBOM](supply-chain.md) | Not an independent security audit |

## Choose evidence for the claim

For approval rights, retain the two-account result and record ID. For ingestion, retain sample ID, timestamp and destination lot. For recovery, locate a pre-existing record in the restored environment. Attach the revision and environment to each result so another operator can repeat the check.

## Full source and translation status

This English edition is a curated guide, not a line-for-line translation. For exact implementation details, see the [canonical source](../../website/content/capability-matrix.md).

## Main-branch infrastructure

APISIX is default in Compose; optional Flowable provides independent review. See [native review](native-review.md) and [DX-OS governance](dxos-governance.md) for evidence and limits. Production acceptance is separate.
