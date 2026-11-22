# Declarative application kit (v1)

DX-TRACE supports **versioned, declarative applications** that reuse the
existing authenticated Core API, forms, record store, roles and workflow
runtime. A manifest carries validated business schema and policy; installing
it **does not execute third-party JavaScript, shell commands or external URLs**.

This proves that another use case can be installed by configuration rather
than editing the warehouse source code. It is not yet a general-purpose
plugin store or a trusted installer for arbitrary external binaries.

## Package

A manifest uses:

```json
{
  "apiVersion": "dxtrace.io/v1",
  "kind": "DeclarativeApplication",
  "metadata": {
    "id": "maintenance",
    "name": "Yêu cầu bảo trì thiết bị",
    "version": "1.0.0",
    "description": "Independent maintenance workflow"
  },
  "spec": {
    "model": {
      "id": "maintenance",
      "name": "Yêu cầu bảo trì thiết bị",
      "fields": [],
      "permissions": {},
      "workflow": {}
    }
  }
}
```

The inner `model` above is illustrative: copy a complete working schema
from [maintenance](../examples/maintenance/app.json) or
[purchase](../examples/purchase/app.json). Each model must pass the
server-side `validateModel` checks; arbitrary fields/scripts are rejected.
Only the owner can plan and install a new application. The model version is
tracked separately from the application semantic version.

## API

| Method | Path | Permission |
| --- | --- | --- |
| GET | `/api/apps` | Authenticated, lists applications readable by caller |
| GET | `/api/apps/{id}/manifest` | Reader of the model |
| POST | `/api/apps/plan` | Workspace owner, dry-run only |
| POST | `/api/apps/install` | Workspace owner, Idempotency-Key required |
| GET | `/api/platform` | Authenticated, discovers installed models |

POST `/api/apps/plan`:

```json
{
  "manifest": {
    "apiVersion": "dxtrace.io/v1",
    "kind": "DeclarativeApplication",
    "metadata": {
      "id": "maintenance",
      "name": "Yêu cầu bảo trì thiết bị",
      "version": "1.0.0"
    },
    "spec": {"model": {"...": "complete model definition"}}
  }
}
```

The response contains `baseVersion`, `nextVersion`,
`unchanged`, `records` and `rejections`.
Only call `install` with an approved plan and the matching
`baseVersion`. The existing transaction engine checks optimistic locking,
workspace isolation, schema migration and active-record workflow changes,
then writes an audit-ledger entry. A replayed idempotency key returns the
original outcome rather than creating duplicate commands.

Read and write APIs use the session of an authenticated OIDC user. Never
embed `DX_CORE_TOKEN`, service passwords, or device keys in application
manifests, demos or source files.

## Human / Process / Data / Intelligence mapping

- **H:** inherited Identity/SSO, workspace membership, read/create roles;
- **P:** declarative transitions, actor separation, approval reasons, SLA;
- **D:** shared transactional model store, pagination, audit and backups;
- **I:** integrations and assistant capabilities remain optional; the
  application kit does not claim a generic AI-agent runtime.

## Reproducible evidence

```sh
node --test tests/appkit.test.mjs tests/platform.test.mjs
node --test tests/platform-api.test.mjs
```

The tests verify independent models, denied executable manifest fields,
versioned installation plans, role boundaries and persisted model discovery.

## Current limitations

The kit supports **one declarative model per application manifest** and
renders its form/workflow using the common operations console. It does not
currently support external UI bundles, arbitrary plugins, dependency
resolution, signatures, or a sandbox for third-party executable code.
Do not describe these as implemented until the corresponding code and
acceptance tests exist.
