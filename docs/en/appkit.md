<!-- SPDX-FileCopyrightText: 2026 DX-TRACE contributors
SPDX-License-Identifier: MIT
DX-TRACE project authors: Đặng Nhật Minh, Nguyễn Ngọc Hiếu
-->
# AppKit v1

## Contract

A declarative application packages one model and metadata. List installed apps, export a manifest, preview install, then apply with a matching version and idempotency key. The owner installs; read access follows the model.

```bash
node tools/dxtrace.mjs lint examples/maintenance/app.json
```

The manifest does not install arbitrary executable code. A custom frontend must be deployed separately and use trusted same-origin API access.

## Full source and translation status

This English edition is a curated guide, not a line-for-line translation. For exact implementation details, see the [canonical source](../../docs/APPKIT.md).
