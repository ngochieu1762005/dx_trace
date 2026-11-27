<!-- SPDX-FileCopyrightText: 2026 DX-TRACE contributors
SPDX-License-Identifier: MIT
DX-TRACE project authors: Đặng Nhật Minh, Nguyễn Ngọc Hiếu
-->
# Benchmark

## Reproduce local characterization

```bash
node tools/benchmark-platform.mjs --records 10000 --seconds 15 --levels 1,10,25 --out /tmp/dxtrace-load.json
```

Reports include throughput, latency percentiles, errors, environment and source hashes. The historical local run excludes actual TLS and Keycloak and is not a production capacity guarantee. Compare only equivalent workloads and environments.

## Full source and translation status

This English edition is a curated guide, not a line-for-line translation. For exact implementation details, see the [canonical source](../../docs/BENCHMARK.md).
