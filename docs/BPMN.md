# BPMN 2.0 interchange for DX-TRACE

DX-TRACE executes **declarative, server-enforced state-machine workflows**. This
module provides **BPMN 2.0 XML interchange for a documented subset** of those
workflows. It does **not** claim full BPMN execution, Flowable/Camunda
compatibility, parallel gateways, timers or a drag-and-drop designer.

The executable source of truth remains each model's versioned JSON workflow.
The BPMN importer translates the supported XML subset into that model. All
writes still pass through the same approval, role, tenant, optimistic-locking,
idempotency and append-only audit-ledger controls.

## Supported BPMN elements

| BPMN element | DX-TRACE interpretation |
| --- | --- |
| One `startEvent` | Initial state |
| `userTask` | A named state in a model |
| `exclusiveGateway` | Explicit manually chosen XOR decision after a task |
| `sequenceFlow` | Allowed state transition; source/target are validated |
| `endEvent` | Terminal state |
| `dx:roles` | Required roles allowed to perform the transition |
| `dx:guard` | Optional JSON condition: `{field,op,value}` |
| `dx:reasonRequired` | Reject transition without a reason |
| `dx:differentActor` | Creator cannot approve their own record |
| `dx:dueHours` | Due-time calculation after a successful transition |

The extension namespace is
`https://dxtrace.hieuds.com/ns/workflow/v1`. These custom attributes preserve
authorization and business rules when round-tripping. External BPMN editors
may strip or alter custom attributes; **always review a plan before applying**.
For a model with two or more outgoing transitions, XML contains an explicit
exclusive gateway rather than implicitly forking parallel flows.

Only the exported, supported subset is accepted by the importer. Script tasks,
service tasks, inclusive/parallel gateways, subprocesses, boundary events,
expressions, external entities, arbitrary extensions and layout/DI elements
are rejected instead of being silently ignored. This is deliberately narrower
than BPMN 2.0 as a whole.

## API, authorization and migration safety

All endpoints are mounted below the authenticated DX-TRACE API. Public access
requires trusted session identity from the configured OIDC reverse proxy.
Neither the internal Core token nor credentials are placed into browser code.

| Method | Endpoint | Authorization | Result |
| --- | --- | --- | --- |
| GET | `/api/models/{id}/bpmn` | Reader of the model | XML attachment |
| POST | `/api/models/bpmn/plan` | Workspace owner | Dry-run and rejection reasons |
| POST | `/api/models/bpmn/apply` | Workspace owner | Versioned model update |
| GET | `/api/models/{id}/openapi` | Reader of the model | Existing OpenAPI schema |

The POST body is JSON:
```json
{
  "xml": "<?xml version=\"1.0\" encoding=\"UTF-8\"?>...",
  "baseVersion": 1
}
```

For an existing model, the importer keeps its approved fields and permissions
and replaces only the workflow. For a new model, include `definition`
containing `id`, `name`, `fields`, `permissions`; the `workflow` field
of that definition is replaced by the imported workflow. The XML process ID
must be `Process_<model_id>`.

For example, with an authenticated **session** already established:
```sh
# Export a model after logging in via the browser/proxy.
curl -fsS -b session-cookie.txt \
  https://app.example.org/api/models/maintenance/bpmn \
  -o maintenance.bpmn

# Dry-run before any change, passing your session cookie and XML in JSON.
# The API returns baseVersion, nextVersion, unchanged and rejections.
# Never paste production cookies, passwords or Core tokens into issues or logs.
```

`apply` additionally requires an `Idempotency-Key` request header and the
matching `baseVersion` returned by `plan`. The existing transactional model
store rejects stale versions, lost fields and changes to a workflow that has
non-terminal records. Applying a model creates an auditable command in the
workspace ledger; a duplicate idempotency key returns the previous result
without replaying the operation.

## Example: independent maintenance application

`examples/maintenance/model.json` defines a maintenance/approval application
separate from the food-tracing UI. Its process is:

```text
Start → draft → submitted → XOR → approved → done → End
                                ↘ rejected → End
```

The server enforces:

- `warehouse` may submit a draft;
- `manager` or `owner` may approve or reject;
- an actor cannot approve their own record when `differentActor` is true;
- rejection/completion require an audit reason;
- every mutation checks record version and workflow guard conditions.

The same runtime can instantiate the `maintenance`, `purchase`, `quality`
and `customer` declarative examples without modifying the Core source.
This is evidence of **configurable reuse**, not proof that independently
deployed external vendors can install arbitrary applications without
integration work.

## Verification

```sh
node --test tests/bpmn.test.mjs tests/platform.test.mjs
node --test tests/platform-api.test.mjs
```

Checks cover BPMN round-trip, explicit XOR decisions, role restrictions,
reason-required approvals, XML entity injection attempts, unknown executable
nodes and malformed topology. The existing platform API integration test
also tests authorization, audit-ledger integrity, idempotency, backup/restore
and workspace isolation.

## Remaining production gaps

- No full general-purpose BPMN 2.0 engine or visual process editor.
- No BPMN timer/signal events, parallel execution or automatic compensation.
- No automatic deployment of arbitrary external applications via manifest.
- No verified enterprise-scale high availability or formal security
  certification. These need engineering and independent validation.

These limitations are intentional disclosures. Do not mark them as complete
in a presentation, README badge, release note or competition evidence until
a reproducible acceptance test exists.
