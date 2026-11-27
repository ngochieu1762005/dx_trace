<!-- SPDX-FileCopyrightText: 2026 DX-TRACE contributors
SPDX-License-Identifier: MIT
DX-TRACE project authors: Đặng Nhật Minh, Nguyễn Ngọc Hiếu
-->
# Đối chiếu triển khai với DX-OS Open-Core

Phạm vi: **DX-TRACE v0.2.0**, gồm AppKit CLI, SDK cho API tích hợp, APISIX, quy trình Flowable tùy chọn và bằng chứng quyết định. Bảng này liên kết năng lực với mã và cách kiểm chứng; không thay thế nguyên văn thể lệ hoặc xác nhận của ban tổ chức.

| Hạng mục | Triển khai | Minh chứng / cách kiểm tra | Giới hạn |
| --- | --- | --- | --- |
| Identity / SSO | Keycloak + OAuth2 Proxy; quyền thành viên tại Core | `selfhost/realm.json`, `lib/server.ts`, [script kiểm OIDC sống](selfhost/verify-oidc.mjs) cho hai tài khoản cùng kho | Unit tests vẫn mô phỏng; phải chạy live check bằng session thật sau triển khai |
| Biên API | Caddy → signin → app → Gateway → Core; thêm optional external OIDC JWT resource server (v0.0.7) | [Gateway + OIDC](docs/GATEWAY-AND-SSO.md), [API bên ngoài](docs/EXTERNAL-API.md), tests và CI container | v1 chỉ đọc; v2 cho phép ghi theo quyền ứng dụng và người dùng, cần bật dịch vụ riêng; chưa có self-service client portal hay quota phân tán |
| Dữ liệu có cấu trúc | SQLite: workspace, cảm biến, mô hình/hồ sơ | [Migration](drizzle/), test cách ly và phân trang | Kho truyền thống còn JSON, chưa PostgreSQL nghiệp vụ |
| Dữ liệu phi cấu trúc | Tệp PNG/JPEG/PDF, hash, metadata và trạng thái quét | Upload/download/restore tests; [API](docs/API.md) | Kho tệp cục bộ; scanner ngoài là tùy chọn |
| Workflow | State-machine JSON và BPMN XML tập con; v0.0.7 thêm executor fork/join, guarded tasks và timer persisted | [BPMN interchange](docs/BPMN.md), [Process Runtime](docs/PROCESS-RUNTIME.md), kiểm thử lưu trạng thái/timer | Không hỗ trợ toàn bộ BPMN 2.0 hoặc BPMN parallel XML importer, chưa có UI editor kéo thả |
| Core headless | Tiến trình/container API riêng, không UI; App không kết nối privcore | Unit test token sai + smoke Docker từ chối đường trực tiếp tới Core | Demo PC là ngoại lệ chạy cùng tiến trình; chưa có HA |
| Tái sử dụng | Bốn mô hình dùng chung biểu mẫu; Quality Control Portal có frontend/container độc lập dùng chung Core | [Quality Portal](docs/QUALITY-PORTAL.md), `tests/quality-portal.test.mjs`, CI 3 container | Chưa có runtime thực thi plugin ngoài; kiểm SSO trên VPS vẫn cần thực hiện |
| H–P–D–I trong bài toán kho | Người/vai trò; quy trình; dữ liệu lô/số đo; tra cứu hỗ trợ | Quy trình nhập → giao → sự cố → thu hồi và đối soát | AI tùy chọn không quyết định thay người quản lý |
| Vận hành | Sao lưu/verify, ledger, webhook, metrics | [Minh chứng](docs/EVIDENCE.md), [vận hành](selfhost/OPERATIONS.md) | Ledger chưa neo ngoài; chưa HA và giám sát toàn stack |

## Hồ sơ nguồn mở

- [MIT](LICENSE), thông báo giấy phép thành phần và [nguồn biểu trưng](docs/assets/LOGOS.md).
- [Build từ mã nguồn](README.md#quick-setup), lockfile và Dockerfile.
- [Đóng góp](CONTRIBUTING.md), [bảo mật](SECURITY.md), [changelog](CHANGELOG.md).
- [Bản phát hành v0.2.0](https://github.com/ngochieu1762005/dx_trace/releases/tag/v0.2.0) có gói nguồn và checksum.
- [Benchmark](docs/BENCHMARK.md) công bố dữ liệu gốc và phạm vi đo, không dùng số liệu cục bộ làm năng lực VPS.

## Khi trình diễn

Dùng Docker để chứng minh SSO và Core riêng. Dùng hai tài khoản để kiểm quyền, một hồ sơ thu hồi để chứng minh quy trình xuyên suốt, một mô hình mới để chứng minh tái sử dụng. Nêu rõ đâu là dữ liệu mẫu và đâu là số đo thật; không suy ra điểm thi hoặc cam kết triển khai thực tế chỉ từ số lượng tính năng.

## Tái sử dụng lõi bằng cấu hình

Có AppKit khai báo một mô hình nghiệp vụ/app và endpoint cài đặt có dry-run, version check, idempotency. Hai manifest mẫu: [`maintenance`](examples/maintenance/app.json), [`purchase`](examples/purchase/app.json). Đây chưa phải chợ ứng dụng hay hệ plugin chạy mã tùy ý; xem [giới hạn](docs/APPKIT.md).
