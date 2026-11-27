# Acceptance checklist for OLP 2026 — real services, not mock claims

This file separates **source-code and CI proof** from **staging/VPS proof**.
The repository cannot infer that the newest Docker configuration is deployed.
Do not label an item PASSED until it was actually run against a real environment
and a date/Git SHA were recorded.

## 0. Safety and immutable evidence

On the VPS, use the **host Caddy overlay** only, and preserve the separate
websites already configured in `/etc/caddy/Caddyfile`.

~~~bash
cd /opt/dx_trace
git rev-parse HEAD
cd selfhost
docker compose -f compose.yaml -f compose.ubuntu-edge.yaml config --quiet
docker compose -f compose.yaml -f compose.ubuntu-edge.yaml ps
~~~

Record Git SHA, UTC date, OS, Docker version and the names of tested
applications. Never publish `.env`, OAuth cookies, JWTs, data extracts,
real client emails, Keycloak dumps or bearer secrets in a proof artifact.

## 1. True Keycloak SSO and two-actor RBAC

Use two distinct, already-authenticated Keycloak browser sessions:
(1) workspace owner, (2) another member in that **same** workspace with
manager/warehouse/viewer role. The independent Quality Portal shares the
same OAuth2 Proxy session in a production deployment.

Read-only checks (plus one denied owner-only plan):

- Keycloak issuer exactly matches the expected HTTPS realm.
- Anonymous `/api/state` and `/apps/quality/` are denied or redirected.
- Both users authenticate to the main API and independent Quality Portal.
- Both see the same workspace but distinct identities.
- Non-owner receives 403 for owner-only AppKit plan.

If host Node.js is not installed, run Node.js 24 in Docker.
Create cookie files **outside** the repository:

~~~bash
umask 077
read -rsp 'Owner Cookie header: ' X; printf '%s' "$X" > /root/dxtrace-owner.cookie; unset X; echo
read -rsp 'Reviewer Cookie header: ' X; printf '%s' "$X" > /root/dxtrace-reviewer.cookie; unset X; echo
chmod 600 /root/dxtrace-{owner,reviewer}.cookie

cd /opt/dx_trace
docker run --rm --network host \
  --mount "type=bind,src=$PWD,dst=/source,readonly" \
  --mount "type=bind,src=/root/dxtrace-owner.cookie,dst=/secrets/owner,readonly" \
  --mount "type=bind,src=/root/dxtrace-reviewer.cookie,dst=/secrets/reviewer,readonly" \
  -w /source \
  -e DX_VERIFY_APP_ORIGIN=https://app.dxtrace.hieuds.com \
  -e DX_VERIFY_ID_ORIGIN=https://dxauth.hieuds.com \
  -e DX_VERIFY_OWNER_COOKIE_FILE=/secrets/owner \
  -e DX_VERIFY_REVIEWER_COOKIE_FILE=/secrets/reviewer \
  node:24-alpine node selfhost/verify-oidc.mjs
~~~

A successful exit and a report containing `sharedWorkspace:true` plus
`secondApplicationSSO:true` are required. **Always remove the sensitive files
after both the SSO test and the benchmark below**, e.g.
`rm -f /root/dxtrace-{owner,reviewer}.cookie`.

## 2. Actual TLS + Gateway + Core latency

This sends **read-only requests to the public HTTPS application origin**
with a valid cookie, using 1/5/10 concurrent clients and 12 requests per
level (36 total by default). It measures a true HTTPS path, but it is
**not** a claim of browser rendering performance or enterprise scale.

~~~bash
cd /opt/dx_trace
docker run --rm --network host \
  --mount "type=bind,src=$PWD,dst=/source,readonly" \
  --mount "type=bind,src=/root/dxtrace-owner.cookie,dst=/secrets/owner,readonly" \
  -w /source \
  -e DX_BENCH_COOKIE_FILE=/secrets/owner \
  -e DX_BENCH_APP_ORIGIN=https://app.dxtrace.hieuds.com \
  -e DX_BENCH_REQUESTS_PER_LEVEL=12 \
  -e DX_BENCH_COMMIT="$(git rev-parse HEAD)" \
  node:24-alpine node tools/benchmark-live.mjs
~~~

Record JSON result including p50/p95, HTTP status distribution, errors,
request counts, Git SHA and date. For a passing result all three levels
must have zero failures and real HTTP 200 responses. The current
per-subject Gateway quota is 120/minute by default; do not silently
relax security controls to inflate benchmark numbers. End sessions,
then delete local cookie files.

## 3. Isolated warehouse and Keycloak restore

After the documented safe backup from
[selfhost/OPERATIONS](../selfhost/OPERATIONS.md), run:

~~~bash
cd /opt/dx_trace
bash tools/restore-drill.sh /opt/dx-trace-backups/REPLACE_WITH_REAL_DIRECTORY
~~~

The script copies the **warehouse snapshot** to a new temporary directory,
verifies SQLite integrity and stored object hashes, then restores the
**Keycloak custom-format PostgreSQL dump into a throwaway PostgreSQL 17
container with `--network none`**. The production DB, Caddy and named
volumes are untouched. Docker must be allowed to download the relevant
official images beforehand, if missing.

For a complete business restore acceptance, also start a **separate,
disconnected staging deployment** from the recovered data, authenticate
through its own Keycloak callback, and manually compare a sampled workspace,
file, membership, shipment and audit record. The script alone **does not
verify browser login, DNS callbacks or post-restore business behavior**.

## 4. External API staging verification

Only after explicit operator opt-in and an independent Keycloak client:

- No bearer token → 401.
- Incorrect audience, expired token, missing read scope or unverified
  email → 401.
- Registered client requesting an unlisted model → 403.
- Registered client requesting a listed model with real workspace membership
  → 200; compare rows to the same user's portal authorization.
- Exceed the configured per-client quota → 429 and Retry-After header.
- Inspect JSON audit lines: client ID, route, request ID, status, latency;
  no email, JWT, cookie or Core secret.
- Confirm `external-api` is not started when the Compose profile is absent.

See [external client setup](EXTERNAL-API.md). No CI test can substitute
for testing an actual JWT minted by the deployed Keycloak realm.

## 5. Reproducibility and release

- `npm test`, build, Python tests, Docker isolation smoke, secret scan and
  SPDX SBOM CI all green for the **exact commit** being evaluated.
- Release is tagged to the tested SHA, source archive matches that tag;
  SBOM and SHA256/provenance are attached and verifiable.
- Setup from an empty Linux host documented and trial-run independently,
  not only an in-place upgrade on the developer's VPS.
- Maintain a dated record of failed checks and changes. Do not substitute
  screenshots of unit tests for operational evidence.

## Acceptance result template

| Check | Status | Date (UTC) | Git SHA | Evidence |
| --- | --- | --- | --- | --- |
| CI Node/Python/container/SBOM | PASS · disposable CI | 2026-11-27 | PR head d8cefa8 | [CI](https://github.com/ngochieu1762005/dx_trace/actions/runs/45938563664) |
| Keycloak two-user SSO and external OAuth client | PASS · disposable CI | 2026-11-27 | PR head d8cefa8 | [Three portals, API policy and maintenance handover](https://github.com/ngochieu1762005/dx_trace/actions/runs/45938563710) |
| SQLite warehouse, Keycloak and Flowable isolated restores | PASS · disposable CI | 2026-11-27 | PR head d8cefa8 | [Offline snapshot check and PostgreSQL restores](https://github.com/ngochieu1762005/dx_trace/actions/runs/45938563710) |
| VPS TLS benchmark, restored browser login and signed production decision | Pending operator environment | — | — | Record a sanitized acceptance run on the deployed SHA |
| Public tagged release | Check published assets for the submission tag | — | — | [Release and checksums](https://github.com/ngochieu1762005/dx_trace/releases) |

Never pre-fill TODO as PASS before observing the corresponding test.

## Developer Platform v0.2.0

The disposable integration job provisions Keycloak flows, OAuth scopes and client policies, writes a Maintenance record through the external gateway and APISIX, checks it in the portal and verifies a signed decision and tenant isolation. [Test script](../selfhost/scripts/sso-smoke.py) · [Workflow runs](https://github.com/ngochieu1762005/dx_trace/actions/workflows/third-party-core.yml).

For VPS acceptance record the deployed Git SHA, public signing-key fingerprint, two-user SSO result, external API profile, and a restore into isolated volumes. On 27 November 2026 the operator log showed commit 18bc70b and the base, Ubuntu edge and third-party overlays. Production signing, restoration and latency measurements still require a dated run.
