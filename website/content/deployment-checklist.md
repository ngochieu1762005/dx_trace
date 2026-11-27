# Danh sách kiểm tra trước khi triển khai

## Trước khi cài

| Hạng mục | Cách kiểm |
| --- | --- |
| Host | Linux, Docker Compose v2; Node 24 chạy trong Docker |
| DNS/TLS | Domain app và identity đúng, TLS hợp lệ |
| Tài nguyên | Đọc REQUIREMENTS; cấu hình tham khảo không phải benchmark tối thiểu |
| Cấu hình | .env quyền 0600; token nội bộ riêng biệt |
| Caddy | Không chiếm 80/443 nếu host đã chạy Caddy |
| Backup | Có snapshot DB + tệp và Keycloak dump ngoài document root |

## Sau cài

1. Kiểm Compose config bằng --quiet.
2. Kiểm container core, gateway-api (APISIX), app, quality-portal, signin, identitydb và identity; nếu bật Flowable kiểm thêm flowable/workflow-db.
3. Kiểm app → gateway → core health.
4. Kiểm đăng nhập thật bằng hai tài khoản.
5. Kiểm kho thực hành không trộn với kho vận hành.
6. Kiểm tạo hồ sơ, duyệt, từ chối quyền và nhật ký.
7. Kiểm truy xuất, nhận trả và scanner nếu bật.

## Không làm trên VPS đang chạy

Không chạy lại setup, không docker compose down -v, không đổi tên project Compose, không xóa DB, không in token trong log. Dùng script update-ubuntu.sh cho stack Ubuntu chuẩn; không chạy smoke fixture trên production. Đọc [Vận hành](../../selfhost/OPERATIONS.md) trước khi đổi phiên bản.

[Ubuntu và Caddy](../../selfhost/DEPLOY_SAAS_UBUNTU.md) · [Yêu cầu hệ thống](../../REQUIREMENTS.md).

## Kiểm tra qua tên miền sau khi container khởi động

Mở trang giới thiệu bằng cửa sổ riêng tư, chọn đăng nhập kho và xác nhận quay về giao diện kho sau bước xác thực. Tra một mã lô đã biết, rồi mở Quality Portal bằng cùng tài khoản. Ghi riêng kết quả từng bước. Core trả 200 chỉ xác nhận tuyến kiểm tra sức khỏe; phép thử qua trình duyệt còn kiểm tra callback, phiên và quyền ở không gian đang dùng.
