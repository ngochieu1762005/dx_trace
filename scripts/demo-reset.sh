#!/usr/bin/env bash
# SPDX-FileCopyrightText: 2026 DX-TRACE contributors
# SPDX-License-Identifier: MIT
# DX-TRACE project authors: Đặng Nhật Minh, Nguyễn Ngọc Hiếu
# SPDX-License-Identifier: MIT
# SPDX-FileCopyrightText: 2026 DX-TRACE contributors
set -euo pipefail
# Each run gets a disposable database, no existing workspace is touched.
root=$(cd "$(dirname "$0")/.." && pwd -P)
data=$(mktemp -d)
trap 'rm -rf "$data"' EXIT
export DX_LOCAL_DEMO=1 BIND_ADDRESS=127.0.0.1 PORT=8080 PUBLIC_ORIGIN=http://127.0.0.1:8080 DATA_DIR="$data"
node "$root/selfhost/server.mjs"
