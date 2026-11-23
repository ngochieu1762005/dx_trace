# Đối chiếu triển khai với DX-OS Open-Core

Phạm vi: **DX-TRACE main**, gồm v0.0.5 và phần Unreleased (AppKit/BPMN). Bảng này liên kết năng lực với mã và cách kiểm chứng; không thay thế nguyên văn thể lệ hoặc xác nhận của ban tổ chức.

| Hạng mục | Triển khai | Minh chứng / cách kiểm tra | Giới hạn |
| --- | --- | --- | --- |
| Identity / SSO | Keycloak + OAuth2 Proxy; quyền thành viên tại Core | `selfhost/realm.json`, `lib/server.ts`; đăng nhập hai tài khoản cùng kho | Test tự động dùng danh tính mô phỏng, chưa kiểm đầy đủ OIDC |
| Biên API | Caddy → signin → app → Core | [Kiến trúc](docs/HEADLESS-CORE.md), test headless và container | Reverse proxy, chưa có quản trị API client bên thứ ba |
| Dữ liệu có cấu trúc | SQLite: workspace, cảm biến, mô hình/hồ sơ | [Migration](drizzle/), test cách ly và phân trang | Kho truyền thống còn JSON, chưa PostgreSQL nghiệp vụ |
| Dữ liệu phi cấu trúc | Tệp PNG/JPEG/PDF, hash, metadata và trạng thái quét | Upload/download/restore tests; [API](docs/API.md) | Kho tệp cục bộ; scanner ngoài là tùy chọn |
| Workflow | Quy tắc kho, JSON có điều kiện và [BPMN](docs/BPMN.md) | Test version, vai trò, chống tự duyệt, chuyển cấp theo số tiền | BPMN 2.0 interchange tập con; chưa có engine BPMN tổng quát, nhánh song song hoặc editor |
| Core headless | Tiến trình/container API riêng, không UI | Test từ chối token sai, app không gắn volume kho | Demo PC là ngoại lệ chạy cùng tiến trình |
| Tái sử dụng | Bốn mô hình dùng chung biểu mẫu, API, quyền và dữ liệu | [PLATFORM](docs/PLATFORM.md), `examples/` | Không dùng ứng dụng phê duyệt riêng đã gỡ làm bằng chứng |
| H–P–D–I trong bài toán kho | Người/vai trò; quy trình; dữ liệu lô/số đo; tra cứu hỗ trợ | Quy trình nhập → giao → sự cố → thu hồi và đối soát | AI tùy chọn không quyết định thay người quản lý |
| Vận hành | Sao lưu/verify, ledger, webhook, metrics | [Minh chứng](docs/EVIDENCE.md), [vận hành](selfhost/OPERATIONS.md) | Ledger chưa neo ngoài; chưa HA và giám sát toàn stack |

## Hồ sơ nguồn mở

- [MIT](LICENSE), thông báo giấy phép thành phần và [nguồn biểu trưng](docs/assets/LOGOS.md).
- [Build từ mã nguồn](README.md#quick-setup), lockfile và Dockerfile.
- [Đóng góp](CONTRIBUTING.md), [bảo mật](SECURITY.md), [changelog](CHANGELOG.md).
- [Release v0.0.5](https://github.com/ngochieu1762005/dx_trace/releases/tag/v0.0.5) có gói nguồn và checksum.
- [Benchmark](docs/BENCHMARK.md) công bố dữ liệu gốc và phạm vi đo, không dùng số liệu cục bộ làm năng lực VPS.

## Khi trình diễn

Dùng Docker để chứng minh SSO và Core riêng. Dùng hai tài khoản để kiểm quyền, một hồ sơ thu hồi để chứng minh quy trình xuyên suốt, một mô hình mới để chứng minh tái sử dụng. Nêu rõ đâu là dữ liệu mẫu và đâu là số đo thật; không suy ra điểm thi hoặc cam kết triển khai thực tế chỉ từ số lượng tính năng.

## Tái sử dụng lõi bằng cấu hình

Có AppKit khai báo một mô hình nghiệp vụ/app và endpoint cài đặt có dry-run, version check, idempotency. Hai manifest mẫu: [`maintenance`](examples/maintenance/app.json), [`purchase`](examples/purchase/app.json). Đây chưa phải chợ ứng dụng hay hệ plugin chạy mã tùy ý; xem [giới hạn](docs/APPKIT.md).
