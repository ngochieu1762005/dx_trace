# DX-OS Open-Core: independent headless service and applications

The server deployment implements two separately started Node.js processes and
one shared identity system. The `core` process is API-only. It does **not**
ship an end-user UI, does not expose a Docker host port, and owns the only
mounted warehouse volume. The `app` process serves static interfaces and acts
as a same-origin authenticated reverse proxy for API calls; its container
does **not** mount the warehouse data volume.

## Three layers

| DX-OS layer | Code / process | Responsibility |
| --- | --- | --- |
| Layer 1: headless PaaS | `selfhost/core-server.mjs`, `app/api/[...path]/route.ts`, `lib/` | Identity-aware API, workflow, tenant/workspace data, attachments and device ingestion |
| Layer 2: H-P-D-I applications | `app/console.tsx` | Unified warehouse UI with integrated requests and approvals |
| Layer 3: business example | Lot tracking and food recall functions in DX-TRACE Warehouse | Batch traceability, distribution, environmental monitoring and recalls |

## Data flow / trust boundary

```text
Browser / sensor
       |
  Caddy :443
       |
       +--> Keycloak OIDC <--> PostgreSQL (identitydb)
       |
  OAuth2 Proxy (browser access only)
       |
  web app (React + approvals.html; NO warehouse database)
       |
       | Internal-only URL, DX_CORE_TOKEN, trusted identity headers
       v
  headless core API :8081 (NOT published)
       |
       +--> SQLite database, file objects (warehouse volume)
       +--> API integrations (Open Food Facts, optional file scan, optional AI)
```

The only exception to browser OIDC is device ingestion at `POST /api/ingest`.
Caddy routes that endpoint to the web proxy, which relays the device bearer
token to the core. The API validates its device key itself. In production,
Caddy removes browser-supplied identity headers before OAuth2 Proxy attaches
an authenticated user. The core requires the strong internal token before it
processes any API request, and does not serve `index.html` or other assets.

The independent applications share the same OIDC session, workspace identity
and persisted workflow rows. Both use the **same API**, rather than duplicating
data or reimplementing access rules.

* Warehouse UI: `https://APP_HOST/`
* Integrated approvals: `https://APP_HOST/#requests`
* Core discovery: `GET https://APP_HOST/api/platform` (authenticated)
* Workflow creation: `POST /api/workflow` with JSON `{ "title", "content" }`
* Workflow transition: `POST /api/workflow/{id}/transition` with JSON `{ "target": "submitted" }`

For writes supply a unique `Idempotency-Key` request header. Available
transitions include `draft -> submitted -> approved/rejected`; authorized
roles are verified by the core. The workflow definition is currently
maintained in source code; it is **not** yet a general BPMN designer or a
dynamic user-defined workflow runtime.

## Deploy

```sh
node selfhost/setup.mjs kho.example.org id.example.org
cd selfhost
docker compose config --quiet
docker compose up -d --build
docker compose ps
```

`selfhost/setup.mjs` generates `DX_CORE_TOKEN` alongside OIDC secrets.
For an existing installation with an older `.env`, add a **new, independent**
`DX_CORE_TOKEN` of at least 32 unpredictable characters before deploying.
Do not put this token in the frontend bundle or repository. Both containers
receive it only as environment configuration; do not expose the core service's
port or connect untrusted containers to its internal network.

For a demonstration on an offline workstation use `npm run demo` as before;
that explicit loopback-only mode uses the existing in-process backend to avoid
requiring Docker/Keycloak. **It does not demonstrate production SSO or
process separation**. Judges should use Docker mode to verify those features.

## Verification

```sh
pnpm install --frozen-lockfile
node selfhost/build.mjs
node --test tests/*.test.mjs
```

`tests/headless-core.test.mjs` starts two independent Node processes and
checks refusal of direct core access without a token, absence of core UI,
second-app assets, the shared workflow API and workspace isolation.

For production deployment also manually verify HTTPS, OIDC sign-in, refresh,
two users with different roles, file upload checks and Docker-based restore.
The automated integration test exercises simulated **trusted proxy headers**
in a loopback environment; it is **not** a substitute for testing Keycloak
and OAuth2 Proxy in a real deployed stack.

## Limitations (explicit)

* `/api/platform` documents current API resources, but is not a universal API
  gateway with self-service external-client onboarding.
* Workflow transitions are code-defined, not a BPMN executor.
* Application data is currently stored in SQLite and filesystem objects.
  Lakehouse archiving, data lineage, advanced policy engine, MFA enforcement,
  GitOps self-healing, and always-on malware scanning are not implemented.
* For AI answers using Groq, the operator must intentionally supply a key and
  determine whether third-party processing of workspace content is acceptable.

## Interface consolidation

The standalone Approvals UI and scenario playground have been retired. Requests and approval actions remain in the warehouse navigation. Legacy `/apps/approvals/` URLs redirect to `/#requests`; `/demo/` redirects to `/#overview`. The core API, access controls and stored data remain available. Older diagrams showing separate UIs describe the previous presentation layer.
