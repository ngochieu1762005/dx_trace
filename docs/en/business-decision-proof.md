<!-- SPDX-FileCopyrightText: 2026 DX-TRACE contributors
SPDX-License-Identifier: MIT
DX-TRACE project authors: Đặng Nhật Minh, Nguyễn Ngọc Hiếu
-->
# DX-TRACE Evidence Engine

**Business Decision Proof** binds a captured business decision to identity, authorisation, policy/workflow versions, input lineage, state transition and cryptographic integrity. Released in v0.1.0, this feature is included in the v0.2.0 candidate. [Canonical detailed guide](../BUSINESS-DECISION-PROOF.md).

## Capture, signing and export

Core captures a snapshot with the decision and audit transaction. If an Ed25519 key is configured, it seals the manifest at capture time. Export reuses sealed components; it does not sign arbitrary current database content. Unsigned records cannot be exported as authenticated proof. Enabling signing later does not recreate evidence for historical decisions.

Supported capture points include incident creation/approval/closure, quality failure and escalation, projection of a Flowable outcome, and quarantine after three consecutive temperature excursions. For built-in Core transitions, BPMN is documentary with `isExecutable="false"`; it is not asserted engine execution. A Flowable projection uses the deployed BPMN and observed engine history. Inspect provenance before interpreting workflow evidence.

Generate a key in a new directory outside Git:

```bash
node tools/dxtrace.mjs evidence keygen --out /secure/dxtrace-evidence-keys
```

This writes `evidence-private.pem` (PKCS8, mode `0600`) and `evidence-public.pem` (SPKI). The directory must not exist. Configure Core's `DX_EVIDENCE_PRIVATE_KEY_FILE`, or add `selfhost/compose.evidence.yaml` to the existing Compose files with the absolute host path in `DX_EVIDENCE_KEY_FILE`. The overlay mounts the file read-only at `/run/secrets/dxtrace-evidence.pem`. Distribute and pin the public key through an independent trusted channel. Preserve old public keys across rotation; v1 has no built-in revocation or trusted timestamp service.

The container runs as `node` (UID/GID 1000), so a root-owned `0600` key is not readable by Core. As root, prepare one mount file with the appropriate ownership:

```bash
install -d -m 0700 /secure/dxtrace-evidence-mount
install -o 1000 -g 1000 -m 0400 \
  /secure/dxtrace-evidence-keys/evidence-private.pem \
  /secure/dxtrace-evidence-mount/signing.pem
```

Point `DX_EVIDENCE_KEY_FILE` to that file; do not mount the whole key directory. Check UID mappings for rootless Docker. An unreadable or malformed configured signer aborts decisions requiring a signature before commit, rather than silently downgrading them.

Owners/managers use **Nhật ký → DX-TRACE Evidence Engine** to list and export signed decisions in their current warehouse. The API is `GET /api/evidence` and `GET /api/evidence/{id}/export`; training exports retain `?area=training`.

```bash
DXTRACE_URL=https://app.example.org DXTRACE_AREA=training \
  node tools/dxtrace.mjs evidence export --id DECISION_ID --out recall-evidence.tar.gz
```

Use an authenticated session through the `DXTRACE_COOKIE` environment variable; do not put credentials in command arguments or Git. `DXTRACE_URL` accepts HTTPS origins or loopback HTTP. Export refuses existing output files and returns `verified: false`: downloading an archive is not independent verification.

## Archive contents

| File | Purpose |
| --- | --- |
| `manifest.json` | Schema, workspace/decision bindings and artifact hashes |
| `decision.json` | Actor, authority, selected event and before/after transition |
| `events.jsonl` | Audit chain through the captured decision |
| `policy.json` | Captured policy version and allowed roles/transitions |
| `workflow.bpmn` | Workflow bytes linked to identity, version and provenance |
| `data-lineage.json` | Captured sources, data or fingerprints |
| `proof.json` | Algorithms, cross-file bindings and signing-key information |
| `signature.sig` | 64-byte Ed25519 signature over domain-separated canonical manifest bytes |

The `dxtrace.business-decision-proof.v1` format uses Node's SHA-256 and Ed25519. The bounded gzip/ustar reader never extracts files and rejects paths, links, duplicate/extra entries, PAX and excessive sizes. It is a narrow evidence format, not a general tar implementation.

Limits are 16 MiB compressed, 32 MiB expanded tar, 12 MiB per file and 100,000 events. Exceeding a limit fails instead of truncating evidence. The list API returns up to 100 decisions and a `nextBefore` cursor for `?before=...`.

V1 seals the complete audit prefix through the decision. With signing enabled, an oversized snapshot/chain **fails the decision before commit**. Automatic checkpointed segments are not implemented. Monitor ledger growth and validate the actual workload before long-running operation; this is not an unlimited scalability guarantee.

## Offline verification and trust

Use Node.js 24 and the trusted source modules. Verification requires no npm install, network, database, Core or Keycloak:

```bash
node tools/dxtrace.mjs evidence verify recall-evidence.tar.gz \
  --public-key /trusted/dxtrace-evidence-public.pem
```

Alternatively, supply an independently retained SHA-256 checkpoint of the exact **manifest bytes**, not the compressed archive:

```bash
node tools/dxtrace.mjs evidence verify recall-evidence.tar.gz \
  --checkpoint MANIFEST_SHA256
```

The checkpoint is 64 lowercase hexadecimal characters. If both options are supplied, both must match. Exit `0` requires valid anchored proof; missing trust, bad signatures, tampering or inconsistent context return `1`. A public key embedded in the archive, or a checkpoint downloaded alongside it, does not independently establish trust.

Verification covers file hashes, signature, event chain, decision-to-event binding, workspace, actor, policy/action/role, BPMN links, lineage and the captured policy's transition constraints. It validates recorded assertions against captured policy, not against an unspecified current policy or physical reality. It does not certify identity issuance, sensor accuracy, completeness of events, uncompromised signing infrastructure or key revocation.

For native Flowable review-v2 projections it also reconciles the captured instance/business key, deployed BPMN, creator, historic tasks, durable completion intents and process-scoped `Approved`/`Reviewer`/`Reason` variables. It checks recorded roles, creator exclusion and supported accepted/rejected paths. These remain signed capture assertions; offline verification never independently contacts the engine.

## Synthetic demonstration

```bash
node tools/dxtrace.mjs evidence demo --out /tmp/dxtrace-evidence-demo
node tools/dxtrace.mjs evidence verify /tmp/dxtrace-evidence-demo/recall-evidence.tar.gz \
  --public-key /tmp/dxtrace-evidence-demo/evidence-public.pem
node tools/dxtrace.mjs evidence verify /tmp/dxtrace-evidence-demo/recall-evidence-tampered.tar.gz \
  --public-key /tmp/dxtrace-evidence-demo/evidence-public.pem
```

The fixture uses an ephemeral signing key and labels all invented business data. It stores only the public key. The original passes and the tampered inspection fails. This is a cryptographic demo, not production acceptance or a demonstration of independent production-key distribution.

The browser's RC-2026-001 example separately runs WebCrypto checks in memory. After tampering, the original manifest signature can remain valid while manifest/data, event-chain and lineage checks fail. The overall proof must fail. The browser demo does not parse a real archive; use the CLI for exported proof.

```bash
node --test tests/business-evidence.test.mjs tests/evidence-api.test.mjs tests/evidence-demo.test.mjs
```

[Engine](../../lib/business-evidence.mjs) · [Archive reader](../../lib/evidence-archive.mjs) · [CLI](../../tools/evidence-cli.mjs) · [Fault tolerance](fault-tolerance.md) · [H-P-D-I](hdpi.md).
