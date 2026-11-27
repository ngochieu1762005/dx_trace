<!-- SPDX-FileCopyrightText: 2026 DX-TRACE contributors
SPDX-License-Identifier: MIT
DX-TRACE project authors: Đặng Nhật Minh, Nguyễn Ngọc Hiếu
-->
# Demonstrating fault tolerance

DX-TRACE's tests exercise business invariants under duplicate requests, concurrent users and interrupted dependencies. Test results belong to a specific commit and environment; passing CI does not establish production acceptance. [Detailed canonical guide](../FAULT-TOLERANCE.md).

## Ten scenarios

| Failure | Required invariant | Representative test files |
| --- | --- | --- |
| Duplicate request | Same intent returns its committed result even after 601 newer commands; changed inputs conflict | `warehouse-idempotency`, `platform-api`, `selfhost`, `package-lifecycle`, `native-review-recovery` |
| Concurrent approvals | One outcome per task/version; no self-review | `evidence-api`, `platform-api`, `quality-portal`, `native-review-recovery` |
| Reviewer in wrong warehouse | Core rejects access outside the workspace | `quality-portal`, `native-review-recovery` |
| Cross-tenant access | No record enumeration, read or mutation across tenants | `selfhost`, `platform-api`, `package-lifecycle`, `reliable-outbox` |
| Flowable outage | Preserve the hold, persist intent, reconcile before replay | `native-review-recovery`, `cold-chain-workflow`; real-engine integration in `third-party-core.yml` |
| Worker death | Rollback stays atomic; committed audit remains queued; expired leases recover | `reliable-outbox` with SQLite and a worker killed by SIGKILL |
| Tampered audit/proof | Detect file, chain, context or trust-anchor mismatch | `audit-proof`, `business-evidence`, `evidence-demo` |
| EICAR upload | Block before object storage; scanner outage fails closed; pending files remain unavailable | `upload-faults`, `platform-assurance`; scanner fixtures, not real ClamAV acceptance |
| Invalid app permission | Reject installation before a revision change | `package-lifecycle`, `appkit`, `appkit-api` |
| Failed app upgrade | Keep the current valid version/data; support validated rollback | `package-lifecycle`, `application-bundle`, `platform-storage` |

These names refer to `tests/<name>.test.mjs`. Read assertions and the run's log before claiming a scenario was demonstrated. EICAR is an antivirus test fixture; keep tests in an isolated workspace.

## Transactional outbox

An `AFTER INSERT` audit-ledger trigger enqueues delivery within the SQLite transaction. Rollback removes both records; committed events survive worker death. Workers claim a **30-second lease** with a fresh fencing token. A stale worker cannot acknowledge an event after another worker reclaimed it.

Delivery is **at least once**. A receiver may commit before its response is lost, so retries can duplicate transport. Deduplicate the stable `x-dx-event-id` value `workspace:seq` in the receiver's transaction. This is not an exactly-once guarantee across systems.

The policy allows **12 attempts**, exponential delay from **5 seconds** capped at **one hour**, followed by explicit `dead` state. An expired final lease is also recoverable as a dead letter. Owners/managers inspect `GET /api/outbox`; owners retry `POST /api/outbox/{seq}/retry` with `{ "expectedAttempts": n }`, using the actual value they just read. Investigate the destination and its receipt first, then monitor the result. Do not delete queued events to hide a delivery failure.

## Flowable ambiguity and concurrency

Core and Flowable share no transaction. A timeout can occur after the engine commits. Durable start intent and business keys support reconciliation against history. An unknown start with no matching history remains a 409 requiring operator investigation, rather than a blind new start.

Task-completion intent binds `workspace + task`, actor, role and decision. A different actor or changed input conflicts. After a lost response, the adapter checks the exact historic task and decision variables before treating a retry as completed. Core checks and engine task claims prevent conflicting reviewers from approving the same task.

`native-review-recovery` injects faults using HTTP fixtures; the separate third-party workflow exercises a real Flowable engine. These are complementary evidence, not interchangeable tests.

## Uploads and app lifecycle

The upload fault test sends the harmless EICAR fixture through the real Core API to a local scanner fixture and verifies rejection before `BUCKET.put`. Scanner failures return 503 without storage; files awaiting scanning are unavailable for download. This validates Core's policy handling. Proving ClamAV signature detection requires an isolated real scanner with loaded signatures. [Scanner guide](scanner.md).

AppKit rejects permissions outside its allowed capability set. Failed incompatible upgrades keep the previous version and records; stale revisions conflict and validated rollback preserves records. [AppKit](appkit.md).

## Reproduce

After dependency installation and build:

```bash
node --test tests/reliable-outbox.test.mjs tests/native-review-recovery.test.mjs \
  tests/warehouse-idempotency.test.mjs tests/cold-chain-workflow.test.mjs \
  tests/upload-faults.test.mjs tests/package-lifecycle.test.mjs \
  tests/business-evidence.test.mjs tests/evidence-api.test.mjs tests/quality-portal.test.mjs \
  tests/platform-api.test.mjs tests/selfhost.test.mjs
```

For acceptance, retain the commit, active configuration, synthetic workspace, request/task/sample IDs, HTTP results, before/after state and relevant audit/outbox/proof. Check persisted state after restart as well as the response. Local tests do not replace real SSO, engine interruption, scanner, whole-stack restore or host-failure testing. No extra microservices or Kubernetes are required for these invariants.

[CI](../../.github/workflows/ci.yml) · [Real APISIX–Flowable integration](../../.github/workflows/third-party-core.yml) · [Acceptance](acceptance.md) · [Business Decision Proof](business-decision-proof.md).
