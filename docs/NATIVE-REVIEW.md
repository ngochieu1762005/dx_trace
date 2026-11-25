# Native Flowable review — staging candidate

APISIX is the private gateway in base Compose on this branch. Existing workflows keep their current state engine. The Flowable overlay adds an executable BPMN process for an independent release review; it does not release a warehouse lot or migrate existing records.

All requests use the authenticated session through APISIX. POST requires same-origin; start requires Idempotency-Key.
- POST /api/flowable-review/start: {"reference":"review-001"}.
- GET /api/flowable-review/{id}: workspace-scoped state and active tasks.
- POST /api/flowable-review/{id}/complete: {"taskId":"...","approved":true,"reason":"Evidence checked"}.

Both parallel tasks must approve before the demonstration timer and final manager approval. A negative decision ends the process; no inventory change is implied. Flowable owns its task state and history, SQLite retains workspace mapping and durable start intent. Ambiguous starts are not automatically repeated. Back up both databases together with writes suspended. Existing workflows and timers remain enabled; no automatic migration is attempted. Staging CI, actual SSO, failure recovery and restore are acceptance gates.

The supplier_review manifest is a separate AppKit application (existing declarative runtime). Install through the existing plan/install API; no application-specific Core code is required.

## Staging operator runbook (Ubuntu)

Use a separate checkout and separate Compose project with disposable volumes; never point acceptance scripts at production. The following creates only private Core/gateway/Flowable services (no public Caddy or Keycloak ports):

```sh
cd /opt
 git clone --branch feat/dxos-platform-hardening https://github.com/ngochieu1762005/dx_trace.git dxtrace-acceptance
cd dxtrace-acceptance/selfhost
umask 077
node setup.mjs app.example.invalid id.example.invalid
node ../tools/verify-stack.mjs -f compose.yaml -f compose.third-party.yaml
docker compose -p dxtrace-acceptance -f compose.yaml -f compose.third-party.yaml up -d --build core gateway-api flowable
docker compose -p dxtrace-acceptance -f compose.yaml -f compose.third-party.yaml --profile migration-test run --rm migration-smoke
docker compose -p dxtrace-acceptance -f compose.yaml -f compose.third-party.yaml ps
# Only the disposable project; never run -v on production.
docker compose -p dxtrace-acceptance -f compose.yaml -f compose.third-party.yaml down -v
```

The direct identity headers in the smoke runner are synthetic test identities on a trusted disposable network, not proof of Keycloak SSO or a public login method. The stock and native Flowable review are separate state machines. The final decision has no stock side effect; do not describe it as automatic release.
