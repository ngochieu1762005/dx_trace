<!-- SPDX-FileCopyrightText: 2026 DX-TRACE contributors
SPDX-License-Identifier: MIT
DX-TRACE project authors: Đặng Nhật Minh, Nguyễn Ngọc Hiếu
-->
# Testing

## Run the suite

```bash
pnpm install --frozen-lockfile
pnpm test
python3 -m unittest discover -s tests -p '*_test.py'
```

CI includes source verification, container smoke, supply-chain and PostgreSQL import checks. Use isolated synthetic data; review logs and failures. Test permissions, duplicate commands, stale versions, workflow, audit and attachment handling.

## Full source and translation status

This English edition is a curated guide, not a line-for-line translation. For exact implementation details, see the [canonical source](../../docs/TESTING.md).
