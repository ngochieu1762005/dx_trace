# Biên tin cậy

OAuth2 Proxy xác thực người dùng qua Keycloak. App chuyển danh tính qua mạng riêng tới APISIX. Core kiểm workspace, role và phạm vi từng hồ sơ. Gateway giữ credential dịch vụ riêng giữa hai chặng. Cổng app, Core và container portal chỉ được mở theo cấu hình mạng riêng. [Gateway và SSO](GATEWAY-AND-SSO.md)

Chỉ owner thay đổi package. CLI đọc file tương đối bên trong thư mục package. Core kiểm lại quyền, schema, BPMN và phiên bản. Mỗi lần chuyển phiên bản dùng điều kiện revision và transaction SQLite. Người vận hành chịu trách nhiệm tin cậy mã UI của service trước khi cấu hình upstream trên cùng origin. [AppKit](APPKIT.md)

Khi Flowable ngừng đáp ứng sau báo cáo lỗi, lô vẫn bị cách ly. Core chỉ áp trạng thái thu hồi sau khi đọc kết quả kết thúc từ engine và kiểm tra instance gắn với lô. Khôi phục cần đối chiếu snapshot Core và dữ liệu lịch sử Flowable. [Nguồn trạng thái](architecture.md)
