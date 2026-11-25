# Native Flowable review — staging candidate

APISIX is the private gateway in base Compose on this branch. Existing workflows keep their current state engine. The Flowable overlay adds an executable BPMN process for an independent release review; it does not release a warehouse lot or migrate existing records.

All requests use the authenticated session through APISIX. POST requires same-origin; start requires Idempotency-Key.
- POST /api/flowable-review/start: {"reference":"review-001"}.
- GET /api/flowable-review/{id}: workspace-scoped state and active tasks.
- POST /api/flowable-review/{id}/complete: {"taskId":"...","approved":true,"reason":"Evidence checked"}.

Both parallel tasks must approve before the demonstration timer and final manager approval. A negative decision ends the process; no inventory change is implied. Flowable owns its task state and history, SQLite retains workspace mapping and durable start intent. Ambiguous starts are not automatically repeated. Back up both databases together with writes suspended. Existing workflows and timers remain enabled; no automatic migration is attempted. Staging CI, actual SSO, failure recovery and restore are acceptance gates.

The supplier_review manifest is a separate AppKit application (existing declarative runtime). Install through the existing plan/install API; no application-specific Core code is required.
