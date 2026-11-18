# DX-TRACE — triển khai landing, workspace và SSO trên Ubuntu

Hướng dẫn **chung cho người tự triển khai**, không liên quan đến nhà cung cấp hosting hay tên miền của tác giả. Mỗi người tự chuẩn bị DNS, IP, chứng chỉ TLS, mật khẩu, đường dẫn ứng dụng và chính sách sao lưu.

## Kiến trúc và các tên miền mẫu

| Tên miền bạn tự cấu hình | Vai trò |
| --- | --- |
| `landing.example.org` | Landing công khai, static HTML/CSS/JS trong `landing/` |
| `app.example.org` | Workspace sau đăng nhập, OAuth2 Proxy phía trước web |
| `id.example.org` | Keycloak cung cấp OIDC, cơ sở dữ liệu PostgreSQL riêng |

**Quan trọng:** `example.org` là tên miền mẫu theo chuẩn tài liệu. **Không sao chép tên miền demo hoặc IP người phát triển** vào hệ thống của bạn. Nếu đang vận hành website khác trên Caddy, cấu hình mới không được ghi đè các site đó.

### Yêu cầu

- Ubuntu Linux, Docker Engine, Docker Compose v2, Caddy đang chạy trên host và cổng 80/443 mở.
- Node.js 24 để tạo `.env` lần đầu; Git để cập nhật mã nguồn.
- Bản ghi DNS A/AAAA do **bạn** quản lý cho cả ba tên miền tới IP máy chủ **của bạn**.
- Đủ RAM/dung lượng cho Keycloak, PostgreSQL, web, core và sao lưu.
- Đối với máy chủ đã cài: sao lưu `selfhost/.env`, dữ liệu kho, file upload, database Keycloak trước khi cập nhật. **Không dùng `docker compose down -v`**.

## 1. Lấy mã nguồn và khởi tạo

```bash
git clone https://github.com/<YOUR-ACCOUNT>/dx_trace.git dx-trace
cd dx-trace
node selfhost/setup.mjs app.example.org id.example.org
```

Thay URL clone bằng URL repository hiện hành. Nếu đã có `selfhost/.env`, **không** chạy lại setup và không tạo khóa/người dùng mới. `APP_HOST` phải là domain workspace, `ID_HOST` là domain Keycloak. Không commit `selfhost/.env` lên GitHub.

### 2. Chạy Compose cùng Caddy host

```bash
cd selfhost
docker compose -f compose.yaml -f compose.ubuntu-edge.yaml config --quiet
docker compose -f compose.yaml -f compose.ubuntu-edge.yaml up -d --build \
  identitydb identity core app signin
docker compose -f compose.yaml -f compose.ubuntu-edge.yaml ps
cd ..
```

Override `compose.ubuntu-edge.yaml` bind các cổng `8180`, `8181`, `8182` ở `127.0.0.1` và vô hiệu hóa container gateway. **Không** chạy gateway Docker nếu Caddy trên host đã chiếm 80/443. Chạy Caddy cùng user có thể đọc được `landing/index.html`.

## 3. Caddy: cài đặt mới hoặc chuyển đổi từ miền cũ

Xem [mẫu 3 site](Caddyfile.ubuntu.saas.snippet) trước. Thay `landing.example.org`, `app.example.org`, `id.example.org`, `/srv/dx-trace/landing` bằng thông tin thực tế **của bạn**. Thêm block mới vào Caddyfile khi **chưa** có các block trùng tên, kiểm tra trước bằng:

```bash
sudo caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
sudo systemctl reload caddy
```

Nếu **đang chuyển một website đã tồn tại** sang mô hình landing + app riêng, dùng công cụ an toàn với **đầy đủ các đối số** thay vì copy IP/domain của một triển khai khác:

```bash
sudo python3 selfhost/scripts/install-saas-caddy.py \
  --old-app-host app-old.example.org \
  --landing-host landing.example.org \
  --app-host app.example.org \
  --id-host id.example.org \
  --landing-root "$PWD/landing" \
  --dry-run
```

Lưu ý khi di chuyển: `--old-app-host` là website cũ đã chứa app; `--landing-host` là domain landing mới; nếu dùng lại chính domain cũ cho landing, đặt hai giá trị bằng nhau. Sau khi kiểm tra kỹ kết quả `--dry-run`, bỏ cờ `--dry-run` để áp dụng. Script có sao lưu Caddyfile, validate và rollback khi reload thất bại; bảo toàn các site không được nhắm tới.

**Không bắt buộc dùng script này.** Với cài đặt mới không có site cũ, cấu hình Caddy thủ công bằng mẫu là phù hợp hơn.

## 4. Sửa OIDC callback

Keycloak realm: `warehouse`, client: `dx-trace`. Trong **Valid redirect URIs** phải có:

```text
https://app.example.org/oauth2/callback
```

Trên máy chủ, sau khi `.env` đã khai báo `APP_HOST=app.example.org`:

```bash
python3 selfhost/scripts/fix-oidc-redirect.py
python3 selfhost/scripts/fix-oidc-redirect.py --apply
```

Script chỉ cập nhật client trong Keycloak qua REST API localhost. Nếu cần giữ callback cũ để quay lui, thêm `--old-app-host app-old.example.org`. **Không** chia sẻ `.env`, access token hay password qua chat, issue hoặc log công khai.

### 5. Tạo tài khoản thử và giao diện SSO

```bash
python3 selfhost/scripts/create-warehouse-user.py
```

Nhập email do bạn kiểm soát, username và mật khẩu mạnh ở prompt. Tài khoản được tạo trong realm `warehouse`, không phải realm `master`. Hướng dẫn cài giao diện xem [BRANDED_LOGIN.md](BRANDED_LOGIN.md).

### 6. Kiểm tra triển khai

```bash
curl -sS -o /dev/null -w "Landing: %{http_code}\n" https://landing.example.org/
curl -sS -o /dev/null -w "App: %{http_code}\n" https://app.example.org/
curl -sS -o /dev/null -w "OIDC: %{http_code}\n" https://id.example.org/realms/warehouse/.well-known/openid-configuration
```

Chờ đợi: landing `200`, app yêu cầu đăng nhập (thường `302`), OIDC `200`. Sau đó xác nhận đăng nhập thực tế rồi truy cập DX-TRACE Warehouse và DX Approvals. HTTP 302 **chưa** xác nhận callback hoặc session hoạt động.

## 7. Cập nhật, sao lưu và phục hồi

- Sao lưu dữ liệu kho từ container `core`, PostgreSQL `identitydb`, tệp upload và `selfhost/.env` ở nơi riêng.
- Nâng cấp: `git pull --ff-only` rồi `docker compose -f compose.yaml -f compose.ubuntu-edge.yaml up -d --build` sau khi đã kiểm tra changelog.
- Khi rollback: phục hồi cấu hình Caddy từ tệp sao lưu; khôi phục `APP_HOST` cũ và tái tạo `signin`/`app` nếu hostname thay đổi.
- Không đưa dữ liệu khách hàng, địa chỉ IP, token, mật khẩu hay cấu hình nội bộ vào Git.

**Đây là hướng dẫn cài chung.** Ba website demo được giới thiệu riêng trong README và **không** phải giá trị cấu hình mặc định.
