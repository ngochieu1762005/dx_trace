<div align="center">

[Tiếng Việt](README.md) · **English**

# DX-TRACE

Food traceability, warehouse operations and recall coordination.

[![CI](https://github.com/ngochieu1762005/dx_trace/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/ngochieu1762005/dx_trace/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-21834d)](LICENSE)
[![Release](https://img.shields.io/github/v/release/ngochieu1762005/dx_trace)](https://github.com/ngochieu1762005/dx_trace/releases)

[Product](https://dxtrace.hieuds.com/en/) · [Application](https://app.dxtrace.hieuds.com/) · [Documentation](https://dxtrace.hieuds.com/docs/en/) · [API Reference](https://dxtrace.hieuds.com/docs/en/api-reference/)

</div>

**Core infrastructure migration (under evaluation):** Apache APISIX is the candidate replacement for the custom gateway; Flowable OSS is the target BPMN engine. The default deployment retains the existing gateway and business workflow runtime until acceptance, state migration and release are complete. See the [architecture and migration plan](docs/en/third-party-core-migration.md).

## Start here

| Goal | Guide |
| --- | --- |
| Run the application locally | [Quick start](https://dxtrace.hieuds.com/docs/en/quickstart/) |
| Understand the system | [Architecture](#architecture) |
| Inspect the HTTP interface | [API reference](https://dxtrace.hieuds.com/docs/en/api-reference/) |

DX-TRACE is an open-source platform for warehouse traceability, food quality and recall coordination. It connects lots, shipments, storage conditions, incidents and reconciliation. The reusable headless Core supports declarative business applications and an independently deployed Quality Portal.

## Follow a lot through a recall

A store has already received part of a lot when an inspection fails. The warehouse needs to identify stock it can still hold, destinations that have received goods and the person authorised to approve a recall. To follow the case on `main`, use the same practice workspace and lot throughout.

| Stage | Action | What to verify |
| --- | --- | --- |
| Receive | Select **Kho thực hành** (practice warehouse). Open **Lô hàng** and record the lot identifier, quantity and expiry. | Use the lot identifier to distinguish deliveries of the same product. |
| Dispatch | Reserve stock for a destination and confirm delivery. | Check the destination, delivered quantity and shipment status. |
| Inspect | Submit an inspection in Quality Portal. A different reviewer records a failed result. | The inspection retains the reason. Quarantine requires a separate management decision. |
| Quarantine | Link the failed inspection to an incident. | The Core blocks new dispatches and delivery confirmation for reserved stock from the lot. |
| Reconcile | Approve the recall with an authorised account and record returns by destination. | Compare returned quantities with deliveries. Export the audit evidence and retain its checkpoint separately. |

[Operating workflow](docs/en/operating-workflows.md) · [Quality Portal](docs/en/quality-portal.md) · [Audit verification](docs/en/audit.md)

### Reproduce the checks

After installing dependencies, run these from the repository root.

| Behaviour | Command |
| --- | --- |
| Scan input recognition | `node --test tests/scan.test.mjs` |
| Inspection review and quarantine boundaries | `node --test tests/quality-portal.test.mjs` |
| Parallel tasks and persisted timers | `node --test tests/process-platform.test.mjs tests/process-timer.test.mjs` |
| Verification of exported audit evidence | `node --test tests/audit-proof.test.mjs` |

Use a printed label and an HTTPS camera session to test scanning on a phone. Use two distinct Keycloak accounts to verify SSO and review permissions on a deployment. [Acceptance guide](docs/en/acceptance.md)

## Architecture

![Architecture](docs/assets/architecture-current-en.svg)

| Layer | Implementation |
| --- | --- |
| Identity | Keycloak + OAuth2 Proxy |
| Edge | Caddy / HTTPS |
| Presentation | React application and Quality Portal |
| Policy | Isolated API Gateway with distinct service credentials |
| Core | Node.js 24, domain rules, AppKit, process runtime, audit |
| Storage | SQLite and content-addressed attachments |
| Deployment | Docker Compose; optional scanner and external OIDC API |

## Platform capabilities

- Declarative AppKit v1 model installation and v2 atomic multi-model bundles.
- Model-generated forms, role-specific record scope, conditional validation and data-quality profiles.
- Finite-state workflows and a documented parallel/timer orchestration subset.
- Traceability by lot, QR and barcode; shipment reservation, quarantine and recall reconciliation.
- Optional device ingestion, scanning and signed webhook notifications.
- Audit-chain verification, external checkpoints, backup verification and release SBOMs.

## Quick start

```bash
git clone https://github.com/ngochieu1762005/dx_trace.git
cd dx_trace
npx --yes pnpm@11.25.0 install --frozen-lockfile
npm run demo
```

Open the loopback address shown in the terminal. This local demo uses synthetic identity; it is not production SSO.

For real deployment, read [Docker Compose](docs/en/selfhost.md), [host Caddy](docs/en/ubuntu.md) and [operations](docs/en/operations.md). Never rerun setup on an existing deployment or delete production volumes.

## Build applications

```bash
node tools/dxtrace.mjs lint examples/maintenance/app.json
node tools/dxtrace.mjs bundle-plan examples/bundles/operations.json
```

See [AppKit tutorial](docs/en/app-tutorial.md), [manifest contract](docs/en/manifest-reference.md) and [API reference](docs/en/api-reference.md). The reference documents HTTP endpoints, authentication, parameters and integration examples.

## Evidence and limits

```bash
pnpm test
python3 -m unittest discover -s tests -p '*_test.py'
```

See [testing](docs/en/testing.md), [evidence](docs/en/evidence.md), [benchmark](docs/en/benchmark.md) and [acceptance](docs/en/acceptance.md). Main is not a published release. Core storage remains SQLite; PostgreSQL migration is an offline rehearsal. Workflow support is a subset, not full BPMN conformance. Production SSO, ClamAV and restore require deployment-specific acceptance.

## Documentation and project

[English documentation](docs/en/README.md) · [Vietnamese canonical documentation](docs/README.md) · [Contributing](docs/en/contributing.md) · [Security](docs/en/security.md) · [Authors](AUTHORS.md) · [License](LICENSE)

The English guides are separately authored summaries of the canonical technical material, with links to exact source. They are not complete line-by-line translations. The operational application UI is currently Vietnamese.

