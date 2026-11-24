# Executable parallel process runtime (opt-in)

DX-TRACE retains its existing **versioned JSON state-machine workflow** and
BPMN 2.0 XML interchange. This additional runtime implements a **bounded,
executable BPMN control-flow subset**: user tasks, one parallel fork/join pair,
relative intermediate timer and end event. It deliberately does **not** import
arbitrary BPMN XML or claim Camunda/Flowable compatibility.

## The demonstration that actually runs

[Process graph](../examples/maintenance/process.parallel.json) contains
`intake → fork → (quality_review ∥ waiting_period → owner_signoff) → join → end`.
The join blocks until **both** branches finish. A waiting period expires using
a **durable UTC timestamp**; restarting Core does not restart the timer.

The process graph can be added to a model as its top-level `orchestration`
property. The model still requires its normal `fields`, `permissions`, and
`workflow` schema. `completeAs` must name an existing terminal state of
the legacy workflow. The old transition endpoint is disabled for records with
a process attached, preventing bypass of the new approval rules.

Example setup using Python, without overwriting an existing model:

~~~bash
python3 - <<'PY'
import json
from pathlib import Path
model = json.loads(Path('examples/maintenance/model.json').read_text())
model['id'] = 'maintenance_parallel'
model['name'] = 'Bảo trì song song và xác nhận'
model['orchestration'] = json.loads(
  Path('examples/maintenance/process.parallel.json').read_text())
Path('/tmp/dxtrace-parallel-model.json').write_text(
  json.dumps({'definition': model}, ensure_ascii=False))
PY
~~~

A workspace owner first calls `POST /api/models/plan` with the above
definition, reviews the plan, then applies it with
`POST /api/models/apply` using `{definition,baseVersion:0}` and a unique
`Idempotency-Key`. The user must be authenticated through Keycloak.
`POST /api/models/maintenance_parallel/records` then creates an instance.
The record includes its initial `process` tokens in its JSON payload.

### Versioned runtime API

| Method | Path | Input | Enforcement |
| --- | --- | --- | --- |
| POST | `/api/models/{model}/process-complete` | `{id,version,task,reason?}` | Active user task, role, optional different-actor/reason, model workspace, record version and idempotency |
| POST | `/api/models/{model}/process-tick` | `{id,version}` | Owner/manager only, trusted server clock; normally executed by the Core timer worker |
| GET | `/api/models/{model}/records` | Optional pagination | Existing workspace/record authorization; includes `process.tokens` and `process.history` |
| GET | `/api/models/{model}/process-bpmn` | No request body | Download validated process as BPMN 2.0 XML with parallel gateways and ISO timer duration |

Each POST requires a unique `Idempotency-Key` and the same-origin
authenticated session checks already enforced for DX-TRACE write APIs.
Model installation still requires the owner. No direct Core token or
unverified identity is accepted from the browser.

### Timer execution and operational guarantees

- Core polls due records every 10 seconds by default. A record's earliest
  pending timer is indexed in `platform_records.due_at`.
- Polling is **at least once**, not exactly once. The worker constructs a
  revision-bound idempotency key; the workspace queue and SQL revision guard
  prevent double application.
- Timer state survives container restart because its `readyAt` is persisted
  in the platform record. No in-memory-only `setTimeout` determines expiry.
- `DX_PROCESS_TIMER_ENABLED=false` disables the worker for maintenance or
  manual processing; use the authenticated owner/manager tick endpoint to
  advance timers.
- The worker processes a bounded batch and continues after individual
  record errors. Audit events identify the internal `dxtrace:timer` actor.

### Limits and non-goals

- Only one structured parallel fork/join pair per graph, 2–5 branches, max
  40 nodes, 70 edges; the graph must be an acyclic DAG. Nested gateways,
  event-based gateways, compensation and subprocesses are intentionally rejected.
- A relative timer is triggered **when a token enters its node**. Timers are
  polled; execution may occur after their exact due instant under load.
- BPMN 2.0 XML **export** is implemented for the executable graph, but import of arbitrary parallel BPMN XML is intentionally unsupported. Custom role/approval attributes in XML require review when imported into another engine.
- No service task executes arbitrary code; no expression eval, scripts,
  dynamic remote plugins, or external BPMN XML import.
- Existing UI remains focused on state-machine workflows; the new
  orchestration is currently accessible through the API and record payload,
  not a graphical BPMN drag-and-drop designer.
- In-memory token calculation is deterministic, but cluster HA and
  distributed timer leadership are not claimed.
- This is an incremental executable engine, **not full BPMN 2.0 coverage**.

## Reproducible tests

~~~bash
node --test tests/process-runtime.test.mjs tests/process-platform.test.mjs tests/process-timer.test.mjs tests/process-bpmn.test.mjs
~~~

Tests prove parallel join ordering, timed release, real role/different-actor
checks in `applyPlatform`, record version conflicts, persistence via
serialization, and bounded timer retries. They do not replace a real Keycloak
two-account acceptance test or an isolated restore drill.

## Operations UI — main after v0.0.7

The operations console now offers **Bảo trì · kiểm tra song song** as a separate model template (`maintenance_parallel`). Record details show active user tasks, timers, partial joins and process history. Buttons respect role and creator separation; Core rechecks all conditions on completion. The work queue links directly to a model and record while retaining the selected workspace. Existing state-machine templates are unchanged.
