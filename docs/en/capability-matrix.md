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

## Full source and translation status

This English edition is a curated guide, not a line-for-line translation. For exact implementation details, see the [canonical source](../../website/content/capability-matrix.md).

## Main-branch infrastructure

APISIX is default in Compose; optional Flowable provides independent review. See [native review](native-review.md) and [DX-OS governance](dxos-governance.md) for evidence and limits. Production acceptance is separate.
