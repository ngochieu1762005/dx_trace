# DX-TRACE v0.0.5 — Extensible Core & Warehouse Operations

> Tài liệu lịch sử của tag v0.0.5. Hướng dẫn hiện hành: [mục lục tài liệu](../README.md) và [vận hành](../../selfhost/OPERATIONS.md). Nội dung dưới mô tả thời điểm phát hành.
Bản phát hành ngày 22/11/2026 bổ sung nền tảng nghiệp vụ mở rộng, cải thiện thao tác kho và công bố minh chứng kiểm thử.

## Điểm mới
- Giữ chuyển đổi **Kho thực hành / Kho vận hành**, mở lại dữ liệu hiện có của từng vùng kho.
- Trang giới thiệu mới; hiển thị sẵn Công cụ & quản trị, thêm thao tác nhanh trên Tổng quan.
- Lọc tồn kho và hạn sử dụng, gợi ý xuất theo FEFO, xuất danh sách đang lọc thành CSV.
- Khai báo mô hình nghiệp vụ bằng JSON để sinh biểu mẫu, API và workflow; xem kế hoạch thay đổi trước khi áp dụng, lưu lịch sử phiên bản.
- Bốn mẫu: bảo trì thiết bị, đề nghị mua sắm, kiểm tra chất lượng và yêu cầu khách hàng.
- Phân quyền hồ sơ, chống tự phê duyệt theo cấu hình, lý do bắt buộc, hạn xử lý và điều kiện chuyển bước theo dữ liệu. Mẫu mua sắm trên 5 triệu đồng yêu cầu chuyển cấp trước khi chủ không gian phê duyệt.
- Hồ sơ mở rộng lưu trong bảng SQLite có chỉ mục; tìm kiếm và phân trang phía máy chủ, lọc quyền trước khi đếm kết quả.
- Hàng đợi ghi có giới hạn theo workspace, kiểm tra phiên bản và mã yêu cầu để hạn chế xung đột và thao tác trùng.
- Nhật ký lệnh nối chuỗi SHA-256, API xác minh, số liệu vận hành có phân quyền; webhook HTTPS ký HMAC và thử lại bền vững.
- Công cụ kiểm tra cấu hình và xác minh bản sao lưu; bổ sung tài liệu API, ma trận minh chứng và benchmark tái lập.

## Kiểm chứng và phạm vi
Build, 40 kiểm thử Node.js và 3 kiểm thử Python đã đạt trên mã nền của bản phát hành; CI phát hành chạy lại các kiểm tra này cùng bài kiểm app/Core trong container trước khi công bố.

Đã kiểm trên trình duyệt: áp dụng mẫu mua sắm, tạo hồ sơ 20 triệu đồng và tìm kiếm có/không có kết quả. Bài đo HTTP cục bộ với 10.000 hồ sơ ban đầu, các mức 1/10/25 client đồng thời ghi nhận 0 lỗi trong lần chạy 15 giây mỗi mức. Đây không phải công bố sức chứa VPS: bài đo không bao gồm Keycloak, TLS, gateway hoặc mạng Internet.

Xem [minh chứng](https://github.com/ngochieu1762005/dx_trace/blob/v0.0.5/docs/EVIDENCE.md) và [phương pháp, dữ liệu benchmark](https://github.com/ngochieu1762005/dx_trace/blob/v0.0.5/docs/BENCHMARK.md).

## Nâng cấp — cần sao lưu trước
1. Sao lưu SQLite, tệp đính kèm, PostgreSQL của Keycloak, cấu hình Compose, Caddy và `.env`. Xác minh bản sao lưu trước khi tiếp tục.
2. Cập nhật mã nguồn, build và tạo lại `core`, `app` với cấu hình Compose hiện dùng. Giữ nguyên Docker volumes; không chạy `docker compose down -v`.
3. Khi Core khởi động, migration chuyển mô hình/hồ sơ mở rộng cũ sang bảng riêng trong một transaction, giữ ID, phiên bản, lịch sử và vùng kho. Không đặt lại dữ liệu lô hàng.
4. Nếu nâng cấp từ tag v0.0.4, đồng bộ thư mục `landing/` đến nơi Caddy phục vụ trang giới thiệu.
5. Kiểm tra đăng nhập thật, hai vùng kho, dữ liệu cũ, tạo hồ sơ và phê duyệt bằng hai tài khoản khác nhau.

**Quay lui:** không chạy image cũ trên DB đã chuyển đổi. Dừng ghi, khôi phục DB/tệp từ bản sao lưu trước nâng cấp rồi dùng phiên bản tương ứng; đối soát các thay đổi phát sinh sau bản sao lưu.

## Giới hạn
Workflow hiện là máy trạng thái hữu hạn, chưa phải BPMN. Dữ liệu kho truyền thống vẫn dùng JSON; chỉ hồ sơ mở rộng được tách bảng. Chưa công bố HA hay năng lực tải toàn stack. Camera thật và SSO phải kiểm tra trên môi trường triển khai.

## Tải mã nguồn
Assets gồm ZIP, TAR.GZ và `SHA256SUMS`, được đóng gói từ commit phát hành trên GitHub Actions. Không kèm dữ liệu VPS, tài khoản hoặc cấu hình bí mật.

[Changelog](https://github.com/ngochieu1762005/dx_trace/blob/v0.0.5/CHANGELOG.md) · [So sánh v0.0.4…v0.0.5](https://github.com/ngochieu1762005/dx_trace/compare/v0.0.4...v0.0.5)

Giấy phép MIT. Phát hành trên GitHub không tự cập nhật VPS.
