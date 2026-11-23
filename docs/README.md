# Tài liệu DX-TRACE

Phần AppKit, BPMN và Quality Portal đã có ở **v0.0.6**. Các tài liệu Gateway/SSO mô tả thay đổi trên nhánh phát triển **sau v0.0.6**, chưa phải một bản phát hành. Dùng tag riêng khi cần tái lập phiên bản cũ.

| Nhu cầu | Tài liệu |
| --- | --- |
| Hiểu sản phẩm, chạy demo | [README dự án](../README.md), [kịch bản trình diễn](DEMO.md) |
| Chạy và ghi nhận kiểm thử | [Hướng dẫn kiểm thử](TESTING.md) |
| Cài Docker trên máy mới | [Triển khai máy chủ](../selfhost/README.md) |
| Dùng Caddy có sẵn, ba tên miền | [Ubuntu SaaS](../selfhost/DEPLOY_SAAS_UBUNTU.md) |
| Cập nhật, sao lưu, khôi phục | [Vận hành](../selfhost/OPERATIONS.md) |
| Cấu hình giao diện đăng nhập | [Keycloak](../selfhost/BRANDED_LOGIN.md) |
| Hiểu kiến trúc và ranh giới tin cậy | [Headless Core](HEADLESS-CORE.md), [Gateway và kiểm SSO thật](GATEWAY-AND-SSO.md) |
| Tích hợp API | [Danh mục HTTP API](API.md) |
| Tạo mô hình, workflow, webhook | [Nghiệp vụ mở rộng](PLATFORM.md) |
| Nhập/xuất BPMN 2.0 (tập con) | [Giao thức và giới hạn BPMN](BPMN.md) |
| Đóng gói, cài ứng dụng khai báo | [AppKit](APPKIT.md) |
| Ứng dụng kiểm định chạy riêng trên cùng lõi | [Quality Control Portal](QUALITY-PORTAL.md) |
| Tìm tệp cần sửa | [Bản đồ mã nguồn](CODEBASE.md), [giao diện](../app/README.md), [nghiệp vụ](../lib/README.md) |
| Kiểm tra thư viện và phiên bản | [Phụ thuộc và giấy phép](../DEPENDENCIES.md), [toàn bộ lockfile](DEPENDENCIES.md), [SPDX/SBOM và provenance](SUPPLY-CHAIN.md) |
| Đối chiếu triển khai, test và giới hạn | [Minh chứng](EVIDENCE.md), [benchmark](BENCHMARK.md), [yêu cầu](../REQUIREMENTS.md) |
| Đóng góp hoặc báo cáo lỗi | [Đóng góp](../CONTRIBUTING.md), [bảo mật](../SECURITY.md) |
| Nâng cấp từ phiên bản trước | [Changelog](../CHANGELOG.md), [ghi chú phát hành](releases/README.md) |

## Quản lý dự án

[Tác giả](../AUTHORS.md) · [Lộ trình](../ROADMAP.md) · [Quy tắc ứng xử](../CODE_OF_CONDUCT.md) · [Thành phần thứ ba](../THIRD_PARTY_NOTICES.md).

## Quy ước

- Lệnh cài đặt bắt đầu tại thư mục chứa `package.json`, trừ khi có chỉ dẫn `cd selfhost`.
- `*.example.org` là tên miền ví dụ, cần thay trước khi chạy; domain demo trong README không phải cấu hình mặc định.
- Kho thực hành dùng `area=training`; kho vận hành không thêm tham số này. Giữ vùng kho trên cả yêu cầu đọc và ghi.
- Log kiểm thử và benchmark là minh chứng trong phạm vi mô tả, không phải cam kết hệ thống không có lỗi.
- Ghi chú phát hành cũ mô tả phiên bản tại thời điểm phát hành; không dùng làm hướng dẫn cài phiên bản mới.
