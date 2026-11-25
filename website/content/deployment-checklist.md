# Checklist triển khai

## Trước khi cài

| Hạng mục | Cách kiểm |
| --- | --- |
| Host | Linux, Docker Compose v2, Node 24 cho setup |
| DNS/TLS | Domain app và identity đúng, TLS hợp lệ |
| Tài nguyên | Đọc REQUIREMENTS; cấu hình tham khảo không phải benchmark tối thiểu |
| Cấu hình | .env quyền 0600; token nội bộ riêng biệt |
| Caddy | Không chiếm 80/443 nếu host đã chạy Caddy |
| Backup | Có snapshot DB + tệp và Keycloak dump ngoài document root |

## Sau cài

1. Kiểm Compose config bằng --quiet.
2. Kiểm container core, gateway-api, app, quality-portal, signin, identitydb và identity.
3. Kiểm app → gateway → core health.
4. Kiểm đăng nhập thật bằng hai tài khoản.
5. Kiểm kho thực hành không trộn với kho vận hành.
6. Kiểm tạo hồ sơ, duyệt, từ chối quyền và nhật ký.
7. Kiểm truy xuất, nhận trả và scanner nếu bật.

## Không làm trên VPS đang chạy

Không chạy lại setup, không docker compose down -v, không đổi tên project Compose, không xóa DB, không in token trong log. Đọc [Vận hành](../../selfhost/OPERATIONS.md) trước khi đổi phiên bản.

[Ubuntu và Caddy](../../selfhost/DEPLOY_SAAS_UBUNTU.md) · [Yêu cầu hệ thống](../../REQUIREMENTS.md).
