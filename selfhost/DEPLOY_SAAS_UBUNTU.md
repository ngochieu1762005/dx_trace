# Ubuntu: Caddy trên host và ba tên miền

Áp dụng cho v0.0.5, máy đã dùng Caddy hệ thống. Không khởi động gateway Docker cạnh tranh cổng 80/443.

| Domain ví dụ | Đích |
| --- | --- |
| `landing.example.org` | Trang giới thiệu tĩnh `/srv/dx-trace/landing` |
| `app.example.org` | OAuth2 Proxy ở `127.0.0.1:8180`; ingest riêng qua app `127.0.0.1:8182` |
| `id.example.org` | Keycloak ở `127.0.0.1:8181` |

Thay domain bằng tên miền của bạn; giữ nguyên các website khác đang nằm trong Caddyfile. Chuẩn bị Docker, Compose v2, Node.js 24, Git và DNS cho cả ba domain.

## 1. Lấy mã và tạo cấu hình lần đầu

```bash
git clone --branch v0.0.5 https://github.com/ngochieu1762005/dx_trace.git
cd dx_trace
node selfhost/setup.mjs app.example.org id.example.org
cd selfhost
docker compose -f compose.yaml -f compose.ubuntu-edge.yaml config --quiet
docker compose -f compose.yaml -f compose.ubuntu-edge.yaml up -d --build \
  identitydb identity core app signin
cd ..
```

Máy đã có `.env` không chạy setup. Override bind các cổng 8180/8181/8182 vào loopback; Core không publish cổng. Giới hạn RAM trong override là cấu hình tham khảo cần theo dõi, không phải kết quả đo tải.

## 2. Đặt trang giới thiệu ở thư mục Caddy đọc được

Tại gốc repository:

```bash
sudo install -d -m 755 /srv/dx-trace/landing
sudo cp -R landing/. /srv/dx-trace/landing/
sudo find /srv/dx-trace/landing -type d -exec chmod 755 {} +
sudo find /srv/dx-trace/landing -type f -exec chmod 644 {} +
sudo -u caddy test -r /srv/dx-trace/landing/index.html
```

Khi nâng cấp, sao lưu document root hiện tại trước khi chép. Thay URL ví dụ trong sitemap bằng tên miền triển khai. Không phục vụ toàn bộ checkout, `.env` hoặc thư mục backup như static files.

## 3. Cấu hình Caddy

Dùng [Caddyfile.ubuntu.saas.snippet](Caddyfile.ubuntu.saas.snippet), thay domain và root, thêm các block chưa tồn tại vào Caddyfile hiện có. Không dán đè toàn bộ file khi máy chạy website khác.

```bash
sudo cp -a /etc/caddy/Caddyfile "/etc/caddy/Caddyfile.backup-$(date +%Y%m%d-%H%M%S)"
# Chỉnh các block theo snippet trước khi validate.
sudo caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
sudo systemctl reload caddy
```

Nếu đang chuyển website app cũ sang landing/app riêng, có script chuyên dụng. Đọc kết quả dry-run trước:

```bash
sudo python3 selfhost/scripts/install-saas-caddy.py \
  --old-app-host app-old.example.org \
  --landing-host landing.example.org \
  --app-host app.example.org \
  --id-host id.example.org \
  --landing-root /srv/dx-trace/landing \
  --dry-run
```

Chỉ bỏ `--dry-run` khi các site đích đúng. Script có backup/validate/rollback; cài mới không có site cũ thì dùng snippet thủ công. `--old-app-host` là domain site cần thay, không phải một domain bất kỳ trên máy.

### Đường dẫn hiện tại

| Lối vào | Kết quả theo snippet v0.0.5 |
| --- | --- |
| `/login` | Qua SSO đến kho vận hành `/#overview` |
| `/try` | Alias cũ, cũng về kho vận hành; không còn bộ diễn tập riêng |
| `/approvals` | Qua SSO đến `/#requests` |
| Kho thực hành | Chọn trong ứng dụng hoặc dùng `https://app.example.org/?area=training#overview` |

## 4. OIDC và tài khoản

Realm `warehouse`, client `dx-trace`, callback `https://app.example.org/oauth2/callback`. Cài mới setup/realm import dùng domain cấu hình; máy đã có realm không tự cập nhật client chỉ vì sửa file import.

Nếu đổi domain, từ gốc repo:

```bash
python3 selfhost/scripts/fix-oidc-redirect.py
python3 selfhost/scripts/fix-oidc-redirect.py --apply
```

Đọc thay đổi trước `--apply`; có thể giữ domain cũ bằng `--old-app-host`. Tạo tài khoản qua Admin Console theo [hướng dẫn](README.md#tạo-tài-khoản-và-cấp-quyền), hoặc dùng `python3 selfhost/scripts/create-warehouse-user.py` với prompt. Đối chiếu email thực với `OAUTH2_PROXY_OIDC_EMAIL_CLAIM=email`; `sub` là định danh người dùng, không phải email.

## 5. Nghiệm thu

```bash
curl -sS -o /dev/null -w 'Landing: %{http_code}\n' https://landing.example.org/
curl -sS -o /dev/null -w 'App: %{http_code}\n' https://app.example.org/
curl -sS -o /dev/null -w 'OIDC: %{http_code}\n' https://id.example.org/realms/warehouse/.well-known/openid-configuration
```

Landing/OIDC mong đợi 200; app chưa đăng nhập thường 302. Sau đó phải kiểm đăng nhập thật, chuyển kho, quyền, dữ liệu cũ và thao tác ghi. HTTP 302 không chứng minh callback thành công. Nếu 502, xem log app/Core trước khi sửa tài khoản.

## 6. Nâng cấp và phục hồi

Dùng [OPERATIONS.md](OPERATIONS.md) với đúng hai file Compose. Luôn sao lưu SQLite+tệp, Keycloak và cấu hình trước migration. Đồng bộ landing riêng; chỉ reload Caddy sau validate. Không chạy lại setup, không xóa volume và không sửa các domain ngoài phạm vi DX-TRACE.
