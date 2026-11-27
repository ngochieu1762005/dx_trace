<!-- SPDX-FileCopyrightText: 2026 DX-TRACE contributors
SPDX-License-Identifier: MIT
DX-TRACE project authors: Đặng Nhật Minh, Nguyễn Ngọc Hiếu
-->
# Evidence matrix

## Types of evidence

Repository tests establish behavior only under their fixtures. Container smoke tests establish service integration in CI, not real Keycloak acceptance. Local benchmarks measure the stated hardware, topology and workload. Production validation requires actual deployment results.

See [testing](testing.md), [benchmark](benchmark.md), [acceptance](acceptance.md) and pinned canonical evidence for detailed cases.

## Full source and translation status

This English edition is a curated guide, not a line-for-line translation. For exact implementation details, see the [canonical source](../../docs/EVIDENCE.md).
