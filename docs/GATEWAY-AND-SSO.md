<!-- SPDX-FileCopyrightText: 2026 DX-TRACE contributors
SPDX-License-Identifier: MIT
DX-TRACE project authors: Đặng Nhật Minh, Nguyễn Ngọc Hiếu
-->
# DX-TRACE: isolated API Gateway and live OIDC acceptance

Status: **APISIX is the default gateway in v0.2.0**. Integration CI passed for PR #35; production SSO still requires live verification.

## Architecture and trust boundary

~~~mermaid
flowchart LR
  Browser --> Caddy
  Caddy --> OAuth2["OAuth2 Proxy"]
  OAuth2 <--> Keycloak
  OAuth2 --> App["DX-TRACE App / Quality Portal"]
  App -->|"App-scoped secret"| Gateway["Apache APISIX :8082"]
  Gateway -->|"Core-only secret"| Core["Core :8081"]
  Core --> DB[("SQLite + objects")]
~~~

- App and Gateway share the Docker appnet. Gateway and Core share privcore. **App is not connected to privcore.**
- The Gateway has **no published host port** and is not a substitute for OAuth2 Proxy. Authentication is still performed by Keycloak and OAuth2 Proxy at the HTTPS edge. Caddy must strip all client-supplied identity headers.
- App never receives the Core token. APISIX key-auth validates the application credential; proxy-rewrite sets the separate Core credential; GET/POST routes and client-control enforce the configured method and body policy. Core and the App retain their own checks. The former Node gateway is retained for legacy tests; its exact response caps and redirect behavior are not an APISIX equivalence claim.
- Fixed-window rate limiting defaults to 120 requests per minute per verified forwarded subject (anonymous sensor traffic shares a bucket). It is **per process**, not a distributed WAF or globally enforced API quota. The APISIX limit is declared in selfhost/apisix/apisix.yaml; the legacy Node environment variable does not change it.
- Core remains the authority for workspace membership, RBAC, workflow guards, idempotency and persistence. Gateway is not an external API client management portal; independent third-party OAuth client onboarding, distributed quotas and traffic analytics remain open work.

## Safe migration for an existing VPS

1. **First** review the change in a pull request and wait for all checks. Record the current commit SHA. Back up warehouse volume, Keycloak database and configuration according to [OPERATIONS](../selfhost/OPERATIONS.md). Run a restore drill in a different environment. Do not run setup.mjs again or delete Docker volumes.
2. After merging and updating the working tree, create a **new** app-to-Gateway secret in the existing selfhost/.env (do not reuse DX_CORE_TOKEN):

~~~bash
cd /opt/dx_trace
umask 077
if ! grep -q '^DX_GATEWAY_APP_TOKEN=' selfhost/.env; then
  printf 'DX_GATEWAY_APP_TOKEN=%s\n' "$(openssl rand -hex 32)" >> selfhost/.env
fi
chmod 600 selfhost/.env
# Host Node is optional; use docker compose config --quiet below.
~~~

3. For a host already running Caddy on 80/443, use the two Compose files consistently, never the default configuration alone:

~~~bash
cd /opt/dx_trace/selfhost
docker compose -f compose.yaml -f compose.ubuntu-edge.yaml config --quiet
docker compose -f compose.yaml -f compose.ubuntu-edge.yaml up -d --build core gateway-api quality-portal app
docker compose -f compose.yaml -f compose.ubuntu-edge.yaml ps
docker compose -f compose.yaml -f compose.ubuntu-edge.yaml logs --tail=40 gateway-api core app
~~~

4. Confirm normal login and /api/health via the public HTTPS domain. Confirm Quality Portal. Use the real two-user verification below. If you see errors, **do not run docker compose down -v**; preserve the volumes and restore the previous source/Compose files, keeping a backup of the newly generated .env and old commit.

The default Compose deployment (without host Caddy) uses docker compose -f compose.yaml instead. Never start a second Caddy container on a server where one already owns ports 80/443.

## Live OIDC/RBAC verification, not synthetic identity

These checks require two browser sessions already authenticated through Keycloak: owner and a different non-owner member **of the same workspace** (manager, warehouse or viewer). This script reads existing HTTP Cookie headers; it does not store credentials in a repository or issue and does not perform state-changing transactions. It sends one deliberately unauthorized, owner-only dry-run request.

On the VPS use the browser's developer network panel to copy the full Cookie request-header value for each session, including cookie chunks when present. In a private terminal:

~~~bash
cd /opt/dx_trace
umask 077
read -rsp 'Owner Cookie header: ' OWNER_COOKIE; printf '%s' "$OWNER_COOKIE" > /tmp/dxtrace-owner.cookie; unset OWNER_COOKIE; echo
read -rsp 'Reviewer Cookie header: ' REVIEWER_COOKIE; printf '%s' "$REVIEWER_COOKIE" > /tmp/dxtrace-reviewer.cookie; unset REVIEWER_COOKIE; echo
chmod 600 /tmp/dxtrace-{owner,reviewer}.cookie
export DX_VERIFY_APP_ORIGIN='https://app.example.org'
export DX_VERIFY_ID_ORIGIN='https://id.example.org'
export DX_VERIFY_OWNER_COOKIE_FILE=/tmp/dxtrace-owner.cookie
export DX_VERIFY_REVIEWER_COOKIE_FILE=/tmp/dxtrace-reviewer.cookie
node selfhost/verify-oidc.mjs
rm -f /tmp/dxtrace-{owner,reviewer}.cookie
~~~

Substitute the actual HTTPS origins. Do not put cookie values into shell history, logs, screenshots or GitHub. The verification asserts: correct OIDC issuer; anonymous API **and Quality Portal** denied; owner and non-owner sessions work **on both the main application and independent Quality Portal**; identities are distinct; they share a workspace; non-owner receives HTTP 403 for the read-only AppKit plan endpoint. **Passing unit tests does not mean this live check passed.**

## Reproducible proof for the judges

- Code: selfhost/api-gateway.mjs, selfhost/compose.yaml, selfhost/verify-oidc.mjs.
- Regression tests: tests/api-gateway.test.mjs, tests/verify-oidc.test.mjs, tests/headless-core.test.mjs.
- Docker CI: app, Gateway and Core use separate test networks. From the app container, directly contacting Core must fail while the Gateway path succeeds.
- Capture a dated report with Git SHA, passed/failed results, user roles (not personal email or secrets), and deployment environment.
- Do not count a source-code test as evidence of an actual Keycloak login.

## Remaining limitations

Existing warehouse/AppKit workflow remains constrained; an independent native Flowable process is available via the optional overlay. Full workflow migration is not claimed. Production HA, external API client registration, policy analytics, distributed rate limits, failover and third-party penetration tests are not included in this change. Record these honestly when presenting.