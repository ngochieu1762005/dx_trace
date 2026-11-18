# Bản đồ mã nguồn DX-TRACE

Các đường dẫn dưới đây trỏ tới tệp được phân phối. Thư mục sinh khi build và thư viện cài bằng pnpm được tái tạo từ mã nguồn. [Về README](../README.md) · [Danh mục phụ thuộc](DEPENDENCIES.md).

<a id="app"></a>

## app

| Tệp | Chức năng |
| --- | --- |
| [app/README.md](../app/README.md) | Hướng dẫn của thành phần |
| [app/api/[...path]/route.ts](../app/api/%5B...path%5D/route.ts) | Authenticated warehouse API and device ingestion |
| [app/console.tsx](../app/console.tsx) | Warehouse operations console and navigation |
| [app/globals.css](../app/globals.css) | Warehouse dashboard layout and responsive styles |
| [app/impact.tsx](../app/impact.tsx) | Recall reconciliation by destination |
| [app/scanner.tsx](../app/scanner.tsx) | Camera scanning and printable lot labels |

<a id="lib"></a>

## lib

| Tệp | Chức năng |
| --- | --- |
| [lib/README.md](../lib/README.md) | Hướng dẫn của thành phần |
| [lib/demo.mjs](../lib/demo.mjs) | Training workspace seed data and upgrades |
| [lib/domain.mjs](../lib/domain.mjs) | Warehouse commands, stock rules and incident transitions |
| [lib/impact.mjs](../lib/impact.mjs) | Lot-level recall reconciliation |
| [lib/scan.mjs](../lib/scan.mjs) | Lot label and barcode decoding rules |
| [lib/server.ts](../lib/server.ts) | Workspace isolation, revisions and command persistence |
| [lib/workflow.mjs](../lib/workflow.mjs) | Approval states and role-based transitions |

<a id="selfhost"></a>

## selfhost

| Tệp | Chức năng |
| --- | --- |
| [selfhost/Caddyfile](../selfhost/Caddyfile) | HTTPS routing and trusted proxy boundary |
| [selfhost/Dockerfile](../selfhost/Dockerfile) | Multi-stage Node.js application image |
| [selfhost/README.md](../selfhost/README.md) | Hướng dẫn của thành phần |
| [selfhost/backup.mjs](../selfhost/backup.mjs) | Verified snapshot of warehouse records and files |
| [selfhost/build.mjs](../selfhost/build.mjs) | Production frontend build |
| [selfhost/compose.yaml](../selfhost/compose.yaml) | Self-hosted application and identity services |
| [selfhost/realm.json](../selfhost/realm.json) | OIDC client và realm warehouse |
| [selfhost/realm.json.license](../selfhost/realm.json.license) | Warehouse OIDC realm and client |
| [selfhost/runtime.mjs](../selfhost/runtime.mjs) | SQLite storage, file objects and request identity |
| [selfhost/server.mjs](../selfhost/server.mjs) | HTTP server and authenticated request dispatch |
| [selfhost/setup.mjs](../selfhost/setup.mjs) | First-run configuration and secret generation |
| [selfhost/ui/index.html](../selfhost/ui/index.html) | Warehouse web application shell |
| [selfhost/ui/main.jsx](../selfhost/ui/main.jsx) | React application entry point |

<a id="drizzle"></a>

## drizzle

| Tệp | Chức năng |
| --- | --- |
| [drizzle/0000_watery_mad_thinker.sql](../drizzle/0000_watery_mad_thinker.sql) | Warehouse schema initialization |
| [drizzle/0001_sensor_history.sql](../drizzle/0001_sensor_history.sql) | Persistent temperature history |

<a id="public"></a>

## public

| Tệp | Chức năng |
| --- | --- |
| [public/favicon.svg](../public/favicon.svg) | DX-TRACE application icon |
| [public/fonts/google-sans/LICENSE.txt](../public/fonts/google-sans/LICENSE.txt) | Văn bản đi kèm |
| [public/fonts/google-sans/google-sans-latin-ext-standard-normal.woff2](../public/fonts/google-sans/google-sans-latin-ext-standard-normal.woff2) | Phông chữ phân phối kèm |
| [public/fonts/google-sans/google-sans-latin-standard-normal.woff2](../public/fonts/google-sans/google-sans-latin-standard-normal.woff2) | Phông chữ phân phối kèm |
| [public/fonts/google-sans/google-sans-vietnamese-standard-normal.woff2](../public/fonts/google-sans/google-sans-vietnamese-standard-normal.woff2) | Phông chữ phân phối kèm |

<a id="tests"></a>

## tests

| Tệp | Chức năng |
| --- | --- |
| [tests/domain.test.mjs](../tests/domain.test.mjs) | Stock, permissions and state transition tests |
| [tests/impact.test.mjs](../tests/impact.test.mjs) | Partial-return reconciliation tests |
| [tests/label-image.test.mjs](../tests/label-image.test.mjs) | QR image round-trip test |
| [tests/selfhost.test.mjs](../tests/selfhost.test.mjs) | HTTP isolation, authorization and restore tests |

<a id="github"></a>

## .github

| Tệp | Chức năng |
| --- | --- |
| [.github/ISSUE_TEMPLATE/bug_report.md](../.github/ISSUE_TEMPLATE/bug_report.md) | Tài liệu dự án |
| [.github/workflows/release.yml](../.github/workflows/release.yml) | Verification and tagged source releases |

<a id="docs"></a>

## docs

| Tệp | Chức năng |
| --- | --- |
| [docs/assets/DEVICON-LICENSE.txt](../docs/assets/DEVICON-LICENSE.txt) | Văn bản đi kèm |
| [docs/assets/LOGOS.md](../docs/assets/LOGOS.md) | Tài liệu dự án |
| [docs/assets/architecture.svg](../docs/assets/architecture.svg) | Sơ đồ triển khai và các luồng truy cập |

<a id="root"></a>

## root

| Tệp | Chức năng |
| --- | --- |
| [.dockerignore](../.dockerignore) | Cấu hình hoặc thông báo của dự án |
| [.gitignore](../.gitignore) | Cấu hình hoặc thông báo của dự án |
| [CHANGELOG.md](../CHANGELOG.md) | Tài liệu dự án |
| [CONTRIBUTING.md](../CONTRIBUTING.md) | Tài liệu dự án |
| [LICENSE](../LICENSE) | Cấu hình hoặc thông báo của dự án |
| [README.md](../README.md) | Hướng dẫn của thành phần |
| [REQUIREMENTS.md](../REQUIREMENTS.md) | Tài liệu dự án |
| [package.json](../package.json) | Scripts, engine và thư viện trực tiếp |
| [package.json.license](../package.json.license) | Application manifest |
| [pnpm-lock.yaml](../pnpm-lock.yaml) | Phiên bản và quan hệ phụ thuộc |
| [pnpm-workspace.yaml](../pnpm-workspace.yaml) | Dependency build policy |

## Website giới thiệu và phục hồi phiên

- `landing/index.html`, `landing/assets/site.css`, `landing/assets/site.js`: trang giới thiệu và tình huống SUA-005 tương tác.
- `landing/assets/fonts/`: phông tự lưu trữ, kèm giấy phép.
- `public/shared/session.mjs`: API client nhận biết phiên hết hạn và giữ đích đến khi đăng nhập lại; dùng chung Warehouse/Approvals.
- `tests/session.test.mjs`, `tests/landing_routing_test.py`: kiểm thử phục hồi phiên và định tuyến.
- `.github/workflows/ci.yml`: kiểm tra main/PR và cung cấp trạng thái CI trên README.
