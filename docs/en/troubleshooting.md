<!-- SPDX-FileCopyrightText: 2026 DX-TRACE contributors
SPDX-License-Identifier: MIT
DX-TRACE project authors: Đặng Nhật Minh, Nguyễn Ngọc Hiếu
-->
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

## Locate a failure after sign-in

Record the final callback destination and the status of the first failed request in the Network panel. For an OAuth2 Proxy 502, correlate the timestamp with app and gateway logs. If the interface loads but the API returns 401, compare the session email with the invited email. For a successful read with an empty list, check workspace and data area. Share only the status and redacted error.

## Full source and translation status

This English edition is a curated guide, not a line-for-line translation. For exact implementation details, see the [canonical source](../../website/content/troubleshooting.md).
