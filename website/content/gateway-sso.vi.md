# Cổng API và đăng nhập một lần

Trình duyệt truy cập ứng dụng qua HTTPS. Caddy chuyển yêu cầu qua OAuth2 Proxy để xác thực phiên với Keycloak. Sau khi người dùng đăng nhập, ứng dụng gọi Core qua Apache APISIX. Core xác định người dùng thuộc kho nào và được làm gì với từng hồ sơ.

## Ranh giới giữa các dịch vụ

| Thành phần | Trách nhiệm |
| --- | --- |
| Caddy và OAuth2 Proxy | Tiếp nhận HTTPS, chuyển hướng đăng nhập và xác thực phiên trước khi chuyển yêu cầu vào ứng dụng |
| APISIX | Xác thực dịch vụ gọi API bằng khóa của ứng dụng, chuyển tiếp tới Core bằng khóa riêng |
| Core | Kiểm tra thành viên, vai trò, điều kiện chuyển bước và lưu kết quả trong đúng không gian làm việc |

## Cách kiểm tra

Mở cổng truy xuất rồi chuyển sang cổng kiểm định trong cùng một phiên. Cả hai phải nhận cùng người dùng. Lặp lại bằng một thành viên khác cùng kho và thử thao tác lập kế hoạch cài ứng dụng dành cho chủ kho. Thành viên phải bị từ chối với HTTP 403. Xem [điều kiện nghiệm thu](../../docs/ACCEPTANCE-2026.md) để phân biệt kiểm tra quyền trong kho với cách ly hai kho.
