# Ubuntu and host Caddy

## Host topology

Use compose.yaml plus compose.ubuntu-edge.yaml consistently. Host Caddy serves the landing root and proxies signin at 127.0.0.1:8180, Keycloak at 8181 and the configured app ingest route at 8182. Do not expose Core or start a competing Caddy container.

```bash
cd selfhost
docker compose -f compose.yaml -f compose.ubuntu-edge.yaml config --quiet
```

Back up and validate the existing Caddyfile before any reload. Preserve unrelated sites.

## Full source and translation status

This English edition is a curated guide, not a line-for-line translation. For exact implementation details, see the [canonical source](../../selfhost/DEPLOY_SAAS_UBUNTU.md).
