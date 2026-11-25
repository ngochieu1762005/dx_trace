# Troubleshooting

| Symptom | Check first |
| --- | --- |
| 404 /docs | Landing document root and docs/index.html |
| 502 after sign-in | App, Gateway, Core and proxy logs |
| Empty workspace | Membership, training/live area, project volume |
| 403 | Role, record scope, origin |
| 409 | Current version or state |
| 423 file | Scan status and scanner configuration |
| 503 | Upstream availability |

```bash
cd /opt/dx_trace/selfhost
docker compose -f compose.yaml -f compose.ubuntu-edge.yaml ps
```

Do not bypass authorization, delete volumes or publish raw secrets in issue reports.

## Full source and translation status

This English edition is a curated guide, not a line-for-line translation. For exact implementation details, see the [canonical source](../../website/content/troubleshooting.md).
