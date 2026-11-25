# Apache APISIX and Flowable OSS migration

Status: APISIX is default on main; optional Flowable executes an independent review. PR #35 integration CI passed; this is not a production rollout or migration of all existing workflows.

## Architecture

Browser → Caddy → OAuth2 Proxy / Keycloak → application → APISIX → DX-TRACE Core.
Flowable REST and its PostgreSQL database run on private networks. The current
business workflows still use the existing Core runtime until a separate
migration connects them to Flowable. The acceptance process is independent.

## Evaluate on an isolated test machine

Docker Compose 2.24.4+ is required for override tags. Create an independent
environment using the existing setup instructions. Add separate random
32+ character values for DX_FLOWABLE_DB_PASSWORD and DX_FLOWABLE_API_PASSWORD
to its private .env. Use different DX_CORE_TOKEN and DX_GATEWAY_APP_TOKEN.
Never commit or print those values.

From selfhost:

```sh
docker compose -p dxtrace-migration -f compose.yaml -f compose.third-party.yaml --profile migration-test config --quiet
docker compose -p dxtrace-migration -f compose.yaml -f compose.third-party.yaml up -d --build core gateway-api flowable
docker compose -p dxtrace-migration -f compose.yaml -f compose.third-party.yaml --profile migration-test run --rm migration-smoke
docker compose -p dxtrace-migration -f compose.yaml -f compose.third-party.yaml down
```

No production port is exposed by these selected services. No existing production
volume is mounted if the test project name is unique. Do not run this against
an existing installation. Do not delete production volumes.

The overlay replaces the gateway service implementation, retaining the current
internal port and application interface. Unauthorized status may differ from
the old 403 contract. It deliberately has no public admin API. The Flowable test
deploys a disposable BPMN process, completes parallel tasks, waits for a real
timer and checks historical completion. It does not exercise warehouse workflows.

## Cutover requirements

- Validate APISIX authentication, header provenance, rate limiting, body limits,
  redirect/response-size policies, and current app/external API behavior.
- Map model versions and workspace identifiers to Flowable definitions/instances.
  Keep RBAC, separation of duties, audit and inventory invariants in the Core.
- Persist engine instance/task identifiers and operation intents in a durable
  outbox, reconcile ambiguous retries, and never start duplicate instances.
- Drain or explicitly migrate in-flight legacy processes before disabling their
  timer worker. Never silently replay historical approvals or inventory writes.
- Implement and test tenant isolation, engine downtime, restart recovery, backup
  and restore, and rollback before removing the legacy implementation.
- Update CI, documentation, dependency notices and SBOM before release.

Upstream: Apache APISIX 3.21.0 and Flowable OSS 7.2.0 (Apache-2.0). PostgreSQL
17 (PostgreSQL License). Image tags are pinned, not digest-verified; review
upstream security advisories and pin digests before production.

See [native review](native-review.md) and [governance](dxos-governance.md). [Integration CI](https://github.com/ngochieu1762005/dx_trace/actions/runs/45645226792).
