# Tài liệu DX-TRACE

Áp dụng cho **v0.0.5**. Chọn tài liệu theo việc cần làm; cấu hình và mã nguồn của tag là căn cứ khi tái lập phiên bản.

| Nhu cầu | Tài liệu |
| --- | --- |
| Hiểu sản phẩm, chạy demo | [README dự án](../README.md) |
| Cài Docker trên máy mới | [Triển khai máy chủ](../selfhost/README.md) |
| Dùng Caddy có sẵn, ba tên miền | [Ubuntu SaaS](../selfhost/DEPLOY_SAAS_UBUNTU.md) |
| Cập nhật, sao lưu, khôi phục | [Vận hành](../selfhost/OPERATIONS.md) |
| Cấu hình giao diện đăng nhập | [Keycloak](../selfhost/BRANDED_LOGIN.md) |
| Hiểu kiến trúc và ranh giới tin cậy | [Headless Core](HEADLESS-CORE.md) |
| Tích hợp API | [Danh mục HTTP API](API.md) |
| Tạo mô hình, workflow, webhook | [Nghiệp vụ mở rộng](PLATFORM.md) |
| Tìm tệp cần sửa | [Bản đồ mã nguồn](CODEBASE.md), [giao diện](../app/README.md), [nghiệp vụ](../lib/README.md) |
| Kiểm tra thư viện và phiên bản | [Phụ thuộc](DEPENDENCIES.md) |
| Đối chiếu triển khai, test và giới hạn | [Minh chứng](EVIDENCE.md), [benchmark](BENCHMARK.md), [yêu cầu](../REQUIREMENTS.md) |
| Đóng góp hoặc báo cáo lỗi | [Đóng góp](../CONTRIBUTING.md), [bảo mật](../SECURITY.md) |
| Nâng cấp từ phiên bản trước | [Changelog](../CHANGELOG.md), [ghi chú phát hành](releases/README.md) |

## Quy ước

- Lệnh cài đặt bắt đầu tại thư mục chứa `package.json`, trừ khi có chỉ dẫn `cd selfhost`.
- `*.example.org` là tên miền ví dụ, cần thay trước khi chạy; domain demo trong README không phải cấu hình mặc định.
- Kho thực hành dùng `area=training`; kho vận hành không thêm tham số này. Giữ vùng kho trên cả yêu cầu đọc và ghi.
- Log kiểm thử và benchmark là minh chứng trong phạm vi mô tả, không phải cam kết hệ thống không có lỗi.
- Ghi chú phát hành cũ mô tả phiên bản tại thời điểm phát hành; không dùng làm hướng dẫn cài phiên bản mới.
