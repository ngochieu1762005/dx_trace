# Deployment checklist

## Before installation

Confirm Linux, Docker Compose v2, Node 24, DNS/TLS, storage capacity and the correct Caddy topology. Generate independent service credentials and keep .env private. For upgrades, take verified backups first.

## Acceptance

Check Compose configuration, internal Core health, real SSO with two accounts, workspace separation, roles, record lifecycle, audit, and recovery. Scanner and external OIDC are optional and require separate tests. Never remove production volumes.

## Full source and translation status

This English edition is a curated guide, not a line-for-line translation. For exact implementation details, see the [canonical source](../../website/content/deployment-checklist.md).
