# Bản đồ mã nguồn — v0.0.5

[Tài liệu](README.md) · [Phụ thuộc](DEPENDENCIES.md) · [Giao diện](../app/README.md) · [Nghiệp vụ](../lib/README.md). Các đường dẫn dưới thuộc source; `selfhost/generated/`, `node_modules/` và dữ liệu chạy là đầu ra, không chỉnh trực tiếp để phát hành.

## Giao diện và website

| Đường dẫn | Trách nhiệm |
| --- | --- |
| [app/console.tsx](../app/console.tsx) | Điều hướng kho, tổng quan và các thao tác nghiệp vụ |
| [app/platform.tsx](../app/platform.tsx) | Biểu mẫu mô hình, plan/apply, hồ sơ và phân trang |
| [app/scanner.tsx](../app/scanner.tsx) | Camera/ảnh, bộ chọn lô và tạo tem |
| [app/impact.tsx](../app/impact.tsx) | Đối soát thu hồi |
| [app/globals.css](../app/globals.css) | Bố cục và responsive |
| [selfhost/ui/main.jsx](../selfhost/ui/main.jsx) | Điểm vào React |
| [selfhost/ui/index.html](../selfhost/ui/index.html) | HTML shell |
| [public/shared/session.mjs](../public/shared/session.mjs) | API client và phục hồi phiên |
| [landing/index.html](../landing/index.html) | Trang giới thiệu |
| [landing/assets/site.css](../landing/assets/site.css) | Thiết kế landing |
| [landing/assets/site.js](../landing/assets/site.js) | Tương tác landing |

## Core và nghiệp vụ

| Đường dẫn | Trách nhiệm |
| --- | --- |
| [app/api/[...path]/route.ts](../app/api/%5B...path%5D/route.ts) | Router API kho, mô hình, ledger, metrics và tích hợp |
| [lib/server.ts](../lib/server.ts) | Context, vùng kho, revision và ghi kho truyền thống |
| [lib/domain.mjs](../lib/domain.mjs) | Quy tắc tồn/giao nhận/thu hồi/cảm biến |
| [lib/workflow.mjs](../lib/workflow.mjs) | Đề xuất nội bộ |
| [lib/platform.mjs](../lib/platform.mjs) | Model, điều kiện, kế hoạch thay đổi và OpenAPI |
| [lib/platform-store.ts](../lib/platform-store.ts) | SQL theo quyền, phân trang và transaction hồ sơ |
| [lib/workspace-queue.mjs](../lib/workspace-queue.mjs) | Hàng đợi ghi có giới hạn |
| [lib/impact.mjs](../lib/impact.mjs) | Phép tính đối soát |
| [lib/inventory-view.mjs](../lib/inventory-view.mjs) | Lọc lô, FEFO và CSV |
| [lib/scan.mjs](../lib/scan.mjs) | Chuẩn hóa/đối chiếu mã |
| [lib/demo.mjs](../lib/demo.mjs) | Dữ liệu thực hành và nâng cấp bộ mẫu |

## Runtime và triển khai

| Đường dẫn | Trách nhiệm |
| --- | --- |
| [selfhost/core-server.mjs](../selfhost/core-server.mjs) | Core API độc lập, token nội bộ và webhook worker |
| [selfhost/server.mjs](../selfhost/server.mjs) | Static UI, proxy API, backend cục bộ ở demo |
| [selfhost/runtime.mjs](../selfhost/runtime.mjs) | SQLite WAL, migration, filesystem objects và context |
| [selfhost/migrate-platform.mjs](../selfhost/migrate-platform.mjs) | Tách model/record từ JSON cũ trong transaction |
| [selfhost/webhook.mjs](../selfhost/webhook.mjs) | HMAC, retry và trạng thái giao sự kiện |
| [selfhost/build.mjs](../selfhost/build.mjs) | Build Vite với cấu hình PostCSS cục bộ |
| [selfhost/local-demo.mjs](../selfhost/local-demo.mjs) | Loopback, danh tính thử và dữ liệu demo riêng |
| [selfhost/setup.mjs](../selfhost/setup.mjs) | Tạo .env lần đầu |
| [selfhost/backup.mjs](../selfhost/backup.mjs) | Snapshot DB và objects |
| [selfhost/verify-backup.mjs](../selfhost/verify-backup.mjs) | Integrity và checksum tệp |
| [selfhost/doctor.mjs](../selfhost/doctor.mjs) | Kiểm cấu hình Ubuntu, Node/Compose và tài nguyên |
| [selfhost/container-smoke.mjs](../selfhost/container-smoke.mjs) | Kiểm image app/Core trong CI |
| [selfhost/Dockerfile](../selfhost/Dockerfile) | Image nhiều giai đoạn, chạy tài khoản node |
| [selfhost/compose.yaml](../selfhost/compose.yaml) | Dịch vụ và mạng chuẩn |
| [selfhost/compose.ubuntu-edge.yaml](../selfhost/compose.ubuntu-edge.yaml) | Caddy host, cổng loopback và giới hạn RAM tham khảo |
| [selfhost/compose.windows-edge.yaml](../selfhost/compose.windows-edge.yaml) | Override Windows edge |
| [selfhost/Caddyfile](../selfhost/Caddyfile) | Gateway Docker |
| [selfhost/Caddyfile.ubuntu.saas.snippet](../selfhost/Caddyfile.ubuntu.saas.snippet) | Ví dụ landing/app/identity trên Caddy host |
| [selfhost/Caddyfile.ubuntu.snippet](../selfhost/Caddyfile.ubuntu.snippet) | Ví dụ edge Ubuntu |
| [selfhost/Caddyfile.windows-edge.snippet](../selfhost/Caddyfile.windows-edge.snippet) | Ví dụ edge Windows |
| [selfhost/realm.json](../selfhost/realm.json) | Realm warehouse và OIDC client |
| [selfhost/scripts/install-saas-caddy.py](../selfhost/scripts/install-saas-caddy.py) | Chuyển site Caddy có dry-run/backup/rollback |
| [selfhost/scripts/fix-oidc-redirect.py](../selfhost/scripts/fix-oidc-redirect.py) | Kiểm/cập nhật callback OIDC |
| [selfhost/scripts/create-warehouse-user.py](../selfhost/scripts/create-warehouse-user.py) | Tạo tài khoản qua prompt |

## Dữ liệu và mẫu mở rộng

| Đường dẫn | Trách nhiệm |
| --- | --- |
| [drizzle/0000_watery_mad_thinker.sql](../drizzle/0000_watery_mad_thinker.sql) | 5 bảng gốc: workspace, thành viên, lời mời, khóa và cache |
| [drizzle/0001_sensor_history.sql](../drizzle/0001_sensor_history.sql) | Lịch sử số đo và chỉ mục |
| [drizzle/0002_audit_ledger.sql](../drizzle/0002_audit_ledger.sql) | Ledger và trạng thái webhook |
| [drizzle/0003_platform_records.sql](../drizzle/0003_platform_records.sql) | Model, record, command và chỉ mục |
| [examples/maintenance/model.json](../examples/maintenance/model.json) | Mẫu bảo trì |
| [examples/maintenance/client.mjs](../examples/maintenance/client.mjs) | Client quản trị Core qua môi trường tin cậy; không OAuth SDK |
| [examples/purchase/model.json](../examples/purchase/model.json) | Mua sắm có ngưỡng chuyển cấp |
| [examples/quality/model.json](../examples/quality/model.json) | Kiểm tra chất lượng; mã lô tham chiếu văn bản |
| [examples/customer/model.json](../examples/customer/model.json) | Yêu cầu khách hàng |

## Kiểm thử và công cụ

| Đường dẫn | Trách nhiệm |
| --- | --- |
| [tests/domain.test.mjs](../tests/domain.test.mjs) | Kiểm domain |
| [tests/headless-core.test.mjs](../tests/headless-core.test.mjs) | Kiểm headless core |
| [tests/impact.test.mjs](../tests/impact.test.mjs) | Kiểm impact |
| [tests/inventory-view.test.mjs](../tests/inventory-view.test.mjs) | Kiểm inventory view |
| [tests/label-image.test.mjs](../tests/label-image.test.mjs) | Kiểm label image |
| [tests/landing_routing_test.py](../tests/landing_routing_test.py) | Kiểm landing_routing |
| [tests/platform-api.test.mjs](../tests/platform-api.test.mjs) | Kiểm platform api |
| [tests/platform-storage.test.mjs](../tests/platform-storage.test.mjs) | Kiểm platform storage |
| [tests/platform.test.mjs](../tests/platform.test.mjs) | Kiểm platform |
| [tests/scan.test.mjs](../tests/scan.test.mjs) | Kiểm scan |
| [tests/selfhost.test.mjs](../tests/selfhost.test.mjs) | Kiểm selfhost |
| [tests/session.test.mjs](../tests/session.test.mjs) | Kiểm session |
| [tests/webhook.test.mjs](../tests/webhook.test.mjs) | Kiểm webhook |
| [tests/workspace-queue.test.mjs](../tests/workspace-queue.test.mjs) | Kiểm workspace queue |
| [tools/benchmark-platform.mjs](../tools/benchmark-platform.mjs) | HTTP loopback với DB tạm; không nhận URL production |

## Build và phát hành

| Đường dẫn | Trách nhiệm |
| --- | --- |
| [package.json](../package.json) | Script, engine và phụ thuộc trực tiếp |
| [pnpm-lock.yaml](../pnpm-lock.yaml) | Version/quan hệ phụ thuộc khóa |
| [pnpm-workspace.yaml](../pnpm-workspace.yaml) | Chính sách build phụ thuộc |
| [.github/workflows/ci.yml](../.github/workflows/ci.yml) | Build, tests và container cho main/PR |
| [.github/workflows/release.yml](../.github/workflows/release.yml) | Kiểm tag rồi đóng gói source/checksum |
| [.github/workflows/publish-v0.0.5.yml](../.github/workflows/publish-v0.0.5.yml) | Phát hành riêng v0.0.5: ZIP/TAR.GZ/checksum sau kiểm container |
| [.github/ISSUE_TEMPLATE/bug_report.md](../.github/ISSUE_TEMPLATE/bug_report.md) | Mẫu báo lỗi |

## Tài sản và tài liệu

- `public/fonts/`, `landing/assets/fonts/`: phông tự lưu trữ và giấy phép.
- `selfhost/themes/dxtrace/`: theme login Keycloak tùy chọn; không bắt buộc bật.
- `docs/assets/`: banner, ảnh, sơ đồ và nguồn biểu trưng. Một số sơ đồ SVG cũ không phản ánh kiến trúc hiện tại; dùng README/HEADLESS-CORE làm chuẩn.
- `docs/benchmarks/`: dữ liệu đo nguyên bản, giữ source hashes và giới hạn môi trường.
- `docs/releases/`: ghi chú theo tag, giữ lịch sử phiên bản.
- [Mục lục tài liệu](README.md) là điểm vào cho cài đặt, API, vận hành và minh chứng.

## Theo dõi một thao tác

UI → session/API client → app proxy → Core router → context/quyền → domain hoặc platform → transaction SQLite và ledger → response. Với tệp, đối tượng được ghi vào filesystem và metadata vào kho. Với webhook, worker đọc ledger sau đó gửi độc lập; thành công HTTP nghiệp vụ không có nghĩa bên nhận webhook đã xử lý xong.
