# DX-TRACE v0.0.6 — Independent Quality Portal & AppKit

Phát hành ngày 23/11/2026. Bản cập nhật mở rộng DX-TRACE từ giao diện kho sang ứng dụng kiểm soát chất lượng chạy riêng, dùng chung nền tảng danh tính, dữ liệu và workflow.

## Điểm mới

- **Quality Control Portal** tại `/apps/quality/`: frontend và service riêng, dùng chung phiên đăng nhập, Core API, quyền, hồ sơ và nhật ký. Portal không giữ token Core hoặc kết nối trực tiếp database.
- **AppKit**: manifest JSON có phiên bản, xem kế hoạch và cài mô hình; entrypoint được giới hạn vào đường dẫn cùng origin `/apps/{id}/`.
- **BPMN 2.0 interchange**: xuất/nhập tập con start, user task, XOR, end và sequence flow, bảo toàn vai trò, điều kiện, lý do và hạn xử lý. Không phải engine BPMN tổng quát.
- Kiểm chống tự duyệt, cách ly workspace, idempotency, CSP và khả năng tiếp tục vận hành Core khi portal bị dừng.
- Khôi phục Google Sans, đồng bộ logo xanh #1967D2 và phiên bản URL favicon để làm mới cache.
- Kiểm dấu hiệu bí mật trong mã nguồn tại CI; hoàn thiện tài liệu cài đặt, demo, kiểm thử, phụ thuộc và giấy phép.
- Giữ chuyển đổi **Kho thực hành / Kho vận hành** và dữ liệu của hai vùng.

## Kiểm chứng

Workflow phát hành chỉ công bố sau khi kiểm nguồn, build, toàn bộ kiểm thử Node.js/Python và bài kiểm ba container app/Core/Quality Portal đạt. Bài kiểm tự động dùng danh tính trong môi trường cô lập; không thay thế kiểm đăng nhập Keycloak bằng hai tài khoản thật hoặc camera trên điện thoại.

## Nâng cấp từ v0.0.5

1. Sao lưu và xác minh SQLite, tệp, PostgreSQL Keycloak, `.env`, Compose và Caddy theo [quy trình vận hành](https://github.com/ngochieu1762005/dx_trace/blob/v0.0.6/selfhost/OPERATIONS.md).
2. Lấy mã nguồn v0.0.6; dùng đúng các tệp Compose đang triển khai. Build và tạo lại **core, quality-portal, app** để đưa service mới vào hoạt động. Không xóa volumes, không chạy lại setup sinh bí mật.
3. Giữ signin/Keycloak và tài khoản hiện có. Đồng bộ `landing/` riêng tới thư mục Caddy phục vụ nếu đang dùng trang giới thiệu trên host.
4. Đăng nhập, kiểm dữ liệu hai kho, mở `/apps/quality/` bằng owner và xem kế hoạch trước khi cài manifest. Mô hình quality cũ không tương thích có thể bị từ chối; không xóa hồ sơ để ép cài.
5. Thử tạo/gửi hồ sơ và duyệt bằng người khác. Kiểm lại workflow, phân quyền và nhật ký.

Nếu nâng từ v0.0.4 hoặc cũ hơn, đọc thêm lưu ý migration của v0.0.5. Quay lui cần mã nguồn và bản sao lưu tương ứng; không dùng image cũ trên dữ liệu đã thay đổi mà chưa kiểm tương thích.

## Giới hạn cần biết

- Mã lô trong hồ sơ chất lượng là tham chiếu văn bản; phê duyệt chất lượng chưa tự cách ly tồn kho hay quyết định thu hồi.
- AppKit không chạy plugin tùy ý; BPMN chưa có parallel/timer hoặc designer kéo thả.
- Chưa công bố HA, sức chứa người dùng toàn stack hoặc chứng nhận kiểm toán bảo mật.
- Demo cục bộ kho không tự dựng đầy đủ dịch vụ portal/SSO; xem [hướng dẫn Quality Portal](https://github.com/ngochieu1762005/dx_trace/blob/v0.0.6/docs/QUALITY-PORTAL.md).

## Mã nguồn

Tải `DX-TRACE-v0.0.6.zip` hoặc `DX-TRACE-v0.0.6.tar.gz`, kiểm bằng `SHA256SUMS`. Gói được tạo từ commit phát hành, không kèm tài khoản, bí mật hoặc dữ liệu VPS.

[Changelog](https://github.com/ngochieu1762005/dx_trace/blob/v0.0.6/CHANGELOG.md) · [So sánh v0.0.5…v0.0.6](https://github.com/ngochieu1762005/dx_trace/compare/v0.0.5...v0.0.6)

Giấy phép MIT. Phát hành GitHub không tự cập nhật VPS.
