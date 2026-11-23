# External API: Keycloak OIDC / OAuth 2.0 (read-only v1)

DX-TRACE has **two different gateway boundaries**:

1. Internal `gateway-api` for the browser app: app-to-Core credential
   translation, tenant authorization delegated to Core, per-process quotas.
2. Optional `external-api` resource server for **registered OAuth clients**:
   validates a genuine Keycloak RS256 access token, limits each client to
   named models and a per-client quota, then forwards identity to the internal
   gateway without exposing either secret.

The external API is **off by default**. A Docker Compose profile controls
the container; no host port is published by the default Compose file.
On the Ubuntu + host Caddy overlay, an enabled container binds only
`127.0.0.1:8183`. Public access additionally requires the operator to add a
specific Caddy site/rule. This must not be enabled for the existing app
domain without verifying Caddy route precedence.

## Register an OAuth client

In the Keycloak `warehouse` realm:

1. Create a named OIDC client, e.g. `my-integrator`. Choose Authorization
   Code + PKCE for an end-user delegated integration, or Client Credentials
   only for a deliberately provisioned service account.
2. Configure an audience mapper producing exact `aud: dx-trace-external-api`
   on the **access token**, not just an ID token.
3. Define and include `dxtrace.records.read` in the access token's `scope`.
4. Ensure the signed token contains a real `sub`, `email` and
   `email_verified: true`. The email must already have an authorized
   membership in the target DX-TRACE workspace; the Core performs the
   existing membership and row-level checks. A Client Credentials service
   account needs **explicit membership provisioning and an email claim**:
   there is no anonymous service-account impersonation fallback.
5. Confirm the access token is signed using Keycloak RS256 and `iss` is
   `https://<identity-host>/realms/warehouse`. Symmetric/shared-secret JWT
   algorithms, unverified email and unexpected audiences are rejected.

Do **not** use the Keycloak realm admin credentials or the browser OAuth2
Proxy cookie as an external API token. The external gateway never accepts a
caller-supplied `x-forwarded-user` or `x-dx-core-token`.

## Enable on a private/staging installation

Run from the repository root **after backing up and reviewing this branch**:

~~~bash
cd /opt/dx_trace
cp selfhost/external-clients.example.json selfhost/external-clients.json
chmod 600 selfhost/external-clients.json
# Edit the example's clientId/models/requestsPerMinute to match your Keycloak setup.
cd selfhost
docker compose -f compose.yaml -f compose.ubuntu-edge.yaml \
  --profile external-api config --quiet
docker compose -f compose.yaml -f compose.ubuntu-edge.yaml \
  --profile external-api up -d --build external-api
docker compose -f compose.yaml -f compose.ubuntu-edge.yaml \
  --profile external-api ps external-api
~~~

The JSON policy file is gitignored and mounted read-only. It contains
**client identifiers and permissions**, not client secrets. Keycloak
manages OAuth credentials and revocation. To disable access, remove the
external API container and/or its Caddy route. Rotate and revoke clients
in Keycloak; cached signing keys refresh every five minutes.

Without an explicit public Caddy rule, verify locally:

~~~bash
# Put a fresh, short-lived token in a variable without exposing it in history.
read -rsp 'Keycloak access token: ' ACCESS_TOKEN
echo
curl -fsS -H "Authorization: Bearer $ACCESS_TOKEN" \
  'http://127.0.0.1:8183/v1/models/maintenance/records?limit=10'
unset ACCESS_TOKEN
~~~

To expose to a deliberate new API hostname, create a DNS A/AAAA record
and add only a new block to the **existing host Caddyfile**, e.g.:

~~~caddy
api.example.org {
  reverse_proxy 127.0.0.1:8183
}
~~~

Use your real API DNS and validate Caddy before reload. **Do not overwrite
the host Caddyfile**; the VPS may serve several unrelated websites.

## Contract and trust boundaries

| Method | Versioned route | Minimum requirement |
| --- | --- | --- |
| GET | `/v1/health` | Valid registered JWT |
| GET | `/v1/models/{model}/records` | Valid JWT, client allowlist, read scope, configured model, workspace/row RBAC |

Unknown versions/routes return 404; write methods 405; missing/invalid
tokens 401; disallowed models 403; quota exceeded 429. Unsupported query
parameters, including repeated keys, return 400.

Only allowlisted identity fields are passed to the existing internal
gateway: `x-forwarded-user` is the **verified JWT subject** and
`x-forwarded-email` is the **verified email**. No caller-supplied
identity, Core secret or upstream cookies are forwarded. Response bodies
are capped at 6 MiB and upstream redirects are rejected.

Audit logs contain request ID, OAuth client ID, route, HTTP status and
duration; **no token, email, cookie or response body is written**.
Per-client quotas are per-process fixed windows; horizontal deployment
requires shared limits and central audit ingestion. This is not a
public developer console, API key vending machine, distributed WAF or
a write-capable third-party API.

## Tests and evidence

~~~bash
node --test tests/external-api.test.mjs
~~~

Tests generate a signed RS256 token using a local test key, simulate
a Keycloak JWKS endpoint and assert issuer/audience/verified-email,
scope, client/model allowlist, untrusted header stripping, query handling
and quota. **Passing synthetic JWT tests is not proof that the actual
Keycloak client is configured correctly**. The deployment runbook in
[ACCEPTANCE-2026](ACCEPTANCE-2026.md) records the live test separately.
