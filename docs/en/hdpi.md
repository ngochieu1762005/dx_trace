<!-- SPDX-FileCopyrightText: 2026 DX-TRACE contributors
SPDX-License-Identifier: MIT
DX-TRACE project authors: Đặng Nhật Minh, Nguyễn Ngọc Hiếu
-->
# H-P-D-I in DX-TRACE

Two stores have received chilled stock when a temperature excursion is discovered. The warehouse can follow one lot across all four H–P–D–I dimensions.

| Dimension | Where it appears |
| --- | --- |
| **H · Human** | Role-specific screens, QR, task inbox and notifications. Decision evidence records identity and authority at capture; review separates the creator from approvers. |
| **P · Process** | Inspection and recall BPMN, persisted timers and SLA steps. Core owns warehouse invariants; optional Flowable runs review. Evidence binds a workflow version to the decision. |
| **D · Data** | Lots connect suppliers, readings, shipments, destinations and returns. Evidence retains input snapshots and observed origin. A product barcode does not uniquely identify a lot. |
| **I · Intelligence** | Temperature rules identify risk, while recall impact and outstanding quantities inform an authorised human decision. These calculations require no AI model and do not certify food safety. |

This maps implemented capabilities to [VFOSSA's OLP 2026 open-source competition specification: section 1 for H-P-D-I and section 4 for the four principles](https://vfossa.vn/tin-tuc/de-thi-phan-mem-nguon-mo-olp-2026-798.html). It is not a certification of full competition compliance.

## Seven parts of a verifiable decision

**Nhật ký → DX-TRACE Evidence Engine** connects identity, authorisation, policy version, workflow version, data lineage, state transition and integrity proof. Signing must be configured when the decision is captured. Export the archive and verify it on a machine without Core using an independently trusted public key or checkpoint. [Business Decision Proof](business-decision-proof.md).

The browser's **RC-2026-001** example is explicitly synthetic. Its tamper button changes an inspection result and verifies the mismatch using WebCrypto. It does not establish acceptance of any production system or real business decision.

## Four principles, with observable boundaries

| Principle | Implementation | Boundary |
| --- | --- | --- |
| Data lifecycle tiers | Recent workspace readings, indexed history and monthly gzip JSONL export from a consistent backup. | No automatic purge or WORM guarantee. |
| IT/OT convergence | Device-specific keys and HTTPS ingestion; timestamp, limit and duplicate-sample checks before alerts and quarantine. | Synthetic fixtures are labeled; they do not certify hardware or an MQTT integration. |
| Data lineage and governance | Device, lot, reading and fingerprint lineage; decision snapshots bind policy and workflow. | A signature protects recorded assertions, not the physical truth or accuracy of a sensor. |
| Zero Trust with GitOps | APISIX, separate gateway/Core credentials, Core RBAC and tenant checks, isolated workflow networks, versioned Compose and CI configuration gates. | Desired-state checks are present; a continuous GitOps controller is not. |

[Governance commands](dxos-governance.md) · [Fault scenarios](fault-tolerance.md).

## Cold Chain Digital Twin demonstration

Use a dedicated practice lot and device with an 8°C upper limit. Send three explicitly synthetic 12.4°C readings through the existing HTTPS fixture:

```bash
node tools/sensor-client.mjs https://app.example.org/api/ingest 12.4 3 --training-fixture
```

Provide the training device token through `DX_DEVICE_TOKEN`, never a command argument or Git. Three consecutive excursions within ten minutes commit quarantine and an incident in Core. The fixture persists `synthetic: true`; device screens and evidence retain the simulation label.

With `DX_FLOWABLE_URL` enabled, ingestion starts a **real Flowable review** through a fixed service identity. Devices cannot approve it. Engine unavailability returns `202` with `workflowPending: true` after committing the reading and hold; managers reconcile through `POST /api/quality-recalls/{incident}/sync`. Replaying the same sample/body reconciles without duplicate readings/incidents. Without the overlay, Core quarantine still works. Threshold evidence describes the quarantine rule; the final outcome captures deployed BPMN and observed engine history.

Reconcile samples, device history, the incident and lot state, then continue review with authorised accounts. This is a simple state demonstration using synthetic observations, not a calibrated physical twin. Record the running revision, samples and before/after states during acceptance.

## Reconcile the practice lot SUA-005

1. Select the practice warehouse and look up SUA-005 in traceability. Record its destinations and shipment references. Use the current figures if someone has already edited the sample workspace.
2. Open the recall and check its approval status. In the initial fixture, Long Biên received 30 units and returned 17. Tây Hồ received 20 and returned none. The two destinations still hold **13 + 20 = 33 units**.
3. Thanh Xuân has a separate reservation for 12 units. Cancel that undelivered shipment. Including it in the 33 would overstate the quantity outside the warehouse.
4. Compare each return with the shipment history, actor and timestamp. Keep the incident open while returns are outstanding. Check the lot status after closure before attempting another dispatch.

## Check the people involved

Use two accounts in the same SSO workspace to test the author and reviewer steps. The local demo provides a single owner identity for exploring quantities. In the Quality Portal/Flowable failure-report path, Core quarantines at report commit and later projects the engine's recall outcome. Legacy AppKit inspection records retain a separate management escalation step. State which path the demonstration uses.

[Receive and dispatch](warehouse-guide.md) · [Temperature rules](sensor-guide.md) · [Close a recall](recall-guide.md) · [Acceptance](evaluation.md)
