# API tích hợp qua OAuth2

API phiên bản 1 cho phép ứng dụng đã đăng ký đọc hồ sơ. Ứng dụng lấy mã truy cập ngắn hạn từ Keycloak. Dịch vụ kiểm chữ ký, nơi cấp, đối tượng nhận, thời hạn và quyền đọc trước khi chuyển yêu cầu đến Core.

## Cấp quyền cho ứng dụng

Quản trị viên khai báo mã ứng dụng khách, danh sách mô hình được phép và giới hạn yêu cầu. Với chính sách phiên bản 2, cần chỉ định thêm không gian làm việc, vùng dữ liệu và các quyền được cấp. Người dùng phải là thành viên của không gian làm việc tương ứng.

| Yêu cầu | Kết quả cần đối chiếu |
| --- | --- |
| Đọc danh sách hồ sơ bằng mã truy cập hợp lệ | Core trả những hồ sơ người dùng được đọc trong phạm vi đã cấp |
| Thiếu mã truy cập hoặc mã hết hạn | HTTP 401 |
| Mô hình nằm ngoài danh sách đã cấp | HTTP 403 |
| Vượt số yêu cầu cho phép | HTTP 429 kèm thời gian chờ |

Phiên bản 2 bổ sung thao tác tạo hồ sơ, chuyển bước và đọc tác vụ. Xem [các đường dẫn và quyền của phiên bản 2](../../docs/EXTERNAL-API-V2.md).
