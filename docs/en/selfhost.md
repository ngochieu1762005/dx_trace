# Docker Compose

## Clean installation

```bash
git clone https://github.com/ngochieu1762005/dx_trace.git
cd dx_trace
node selfhost/setup.mjs app.example.org id.example.org
cd selfhost
docker compose config --quiet
docker compose up -d --build
```

Replace domains and configure DNS before use. Setup creates .env; never rerun it on an existing deployment. Core is private. If host Caddy already uses ports 80/443, follow the [Ubuntu guide](ubuntu.md).

## Full source and translation status

This English edition is a curated guide, not a line-for-line translation. For exact implementation details, see the [canonical source](../../selfhost/README.md).
