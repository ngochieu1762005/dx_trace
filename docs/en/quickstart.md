# Quick start

## Requirements

Git, Node.js 24+ and pnpm 11.25.0.

```bash
git clone https://github.com/ngochieu1762005/dx_trace.git
cd dx_trace
npm install --global pnpm@11.25.0
pnpm install --frozen-lockfile
pnpm demo
```

Open the loopback address printed by the process. The local demo uses a synthetic identity, not real SSO. Do not expose it publicly.

## Validate an application

```bash
node tools/dxtrace.mjs lint examples/maintenance/app.json
node tools/dxtrace.mjs bundle-lint examples/bundles/operations.json
pnpm test
```

For production use [Docker Compose](selfhost.md) and [deployment checklist](deployment-checklist.md).

## Full source and translation status

This English edition is a curated guide, not a line-for-line translation. For exact implementation details, see the [canonical source](../../website/content/quickstart.md).
