# Vận hành, nâng cấp và phục hồi

Áp dụng cho mã nguồn sau v0.0.6. Chạy Bash từ thư mục `selfhost/`. Gateway mới yêu cầu bổ sung một khóa mới; đọc [hướng dẫn migration](../docs/GATEWAY-AND-SSO.md) trước khi chạy lệnh trên VPS. Không đặt bản sao lưu trong repository hoặc document root. [Cài mới](README.md) · [Ubuntu Caddy](DEPLOY_SAAS_UBUNTU.md).

## 1. Chọn đúng cấu hình Compose

Dùng **một** cách, nhất quán cho toàn phiên terminal:

```bash
# Máy có Caddy trên host:
dc() { docker compose -f compose.yaml -f compose.ubuntu-edge.yaml "$@"; }
```

Với máy dùng Caddy container mặc định, thay hàm bằng `dc() { docker compose "$@"; }`. Không trộn hai cấu hình giữa các lệnh. Kiểm tra `dc config --quiet` để tránh in giá trị bí mật.

## 2. Sao lưu trước nâng cấp

Chạy khi Core và identitydb đang hoạt động. Dừng app để không nhận ghi mới trong thời gian sao lưu; thao tác này gây gián đoạn ngắn. Không sửa tài khoản Keycloak trong đợt sao lưu.

```bash
(
set -euo pipefail
umask 077
BACKUP="/opt/dx-trace-backups/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP"
git rev-parse HEAD > "$BACKUP/commit.txt"
cp -a .env compose*.yaml "$BACKUP/"
[ ! -f /etc/caddy/Caddyfile ] || cp -a /etc/caddy/Caddyfile "$BACKUP/"
dc stop app
trap 'dc start app >/dev/null 2>&1 || true' EXIT
SNAP="/tmp/warehouse-$(date +%s)"
dc exec -T -e DATA_DIR=/app/data core node selfhost/backup.mjs "$SNAP"
dc exec -T core node selfhost/verify-backup.mjs "$SNAP"
docker cp "$(dc ps -q core):$SNAP" "$BACKUP/warehouse"
dc exec -T identitydb pg_dump -U keycloak -d identity -Fc > "$BACKUP/keycloak.dump"
test -f "$BACKUP/warehouse/COMPLETE"
echo "Backup: $BACKUP"
)
```

`DATA_DIR=/app/data` là bắt buộc cho lệnh backup trong container vì script mặc định dùng đường dẫn tương đối cho môi trường local. SQLite được snapshot bằng `VACUUM INTO`; verifier kiểm integrity và SHA-256 từng tệp. PostgreSQL được dump riêng. Đây không phải transaction đồng thời giữa hai DB; chọn cửa sổ bảo trì và không thay tài khoản trong lúc chạy.

Lưu thêm bản sao ngoài VPS, mã hóa và giới hạn quyền đọc. Kiểm thử phục hồi định kỳ; dấu `COMPLETE` không chứng minh đăng nhập Keycloak hoặc dữ liệu nghiệp vụ đúng trên máy mới. `/api/export` không thay thế backup DB và tệp.

## 3. Nâng cấp mã nguồn

VPS Ubuntu có Caddy trên host: sử dụng script cập nhật mới, không cần Node trên host. Chạy trong cửa sổ bảo trì và tạm ngừng tích hợp ghi ngoài.

```bash
cd /opt/dx_trace
git pull --ff-only origin main
bash selfhost/scripts/update-ubuntu.sh --with-flowable
```

Bỏ `--with-flowable` nếu chỉ muốn APISIX (nếu Flowable đã bật, script giữ overlay). Script kiểm project hiện hữu, sao lưu SQLite/tệp, Keycloak và Flowable nếu đã bật; không xóa volume hoặc sửa Caddy. Cấu hình override ngoài chuẩn phải nâng cấp thủ công. Không chạy migration-smoke trên production. Cần cài python3-venv để dựng docs.

### Thao tác thủ công cho APISIX

Sau khi đã xác minh backup, từ `selfhost/`:

```bash
(
set -euo pipefail
cd ..
if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  git status --short
  echo "Dừng: cần đối chiếu sửa đổi cục bộ trước khi cập nhật."
  exit 1
fi
git pull --ff-only origin main
umask 077
if ! grep -q '^DX_GATEWAY_APP_TOKEN=' selfhost/.env; then
  printf 'DX_GATEWAY_APP_TOKEN=%s\n' "$(openssl rand -hex 32)" >> selfhost/.env
fi
chmod 600 selfhost/.env
# Không cần Node trên host; kiểm Compose bên dưới.
cd selfhost
dc config --quiet
dc pull gateway-api
dc build core quality-portal app
dc up -d core gateway-api quality-portal app
)
```

Từ bản có Quality Control Portal, `quality-portal` là tiến trình frontend tách biệt. Kiểm tra `https://<tên-miền-ứng-dụng>/apps/quality/` sau khi nâng cấp và mở Nghiệp vụ mở rộng để cài manifest theo quyền owner; service không cần thêm cổng công khai hay volume kho. Nếu dừng riêng `quality-portal`, ứng dụng này trả 503 trong khi API Core vẫn có thể phục vụ.

Đọc changelog trước khi chọn `main`. Nếu cần tái lập release, dùng checkout riêng tại tag đã chọn, cùng cấu hình/volume đã kiểm tra; không đổi tên project Compose tùy tiện vì có thể tạo volume trống khác. Chỉ tái tạo `signin` hoặc `identity` nếu có thay đổi cấu hình liên quan. Không chạy lại setup trên hệ thống đã có `.env`; không dùng `down -v`.

Migration 0003 chuyển mô hình/hồ sơ cũ sang bảng riêng trong một transaction. Xung đột làm rollback và dừng khởi động. Các lô, phiếu, lịch sử và vùng kho không bị đặt lại. Không chỉnh tay DB để bỏ qua migration lỗi.

Trang giới thiệu là static file, cần đồng bộ riêng từ `landing/` tới root Caddy theo [hướng dẫn Ubuntu](DEPLOY_SAAS_UBUNTU.md). Build container không cập nhật Caddy host.

## 4. Kiểm tra sau nâng cấp

```bash
dc ps
dc logs --since=5m --tail=80 core gateway-api quality-portal app signin
dc exec -T app node --input-type=module -e '
const r = await fetch(process.env.DX_CORE_URL + "/api/health", {
  headers: {"x-dx-core-token": process.env.DX_CORE_TOKEN},
  signal: AbortSignal.timeout(5000)
});
console.log(r.status, await r.text());
if (!r.ok) process.exit(1);
'
```

Chờ container khởi động rồi kiểm tra. Đảm bảo app chỉ có appnet, Core chỉ có privcore và gateway-api có cả hai mạng. Không chia sẻ token, cookie hoặc log chưa loại dữ liệu nhạy cảm. HTTP 200/DB binding chỉ xác nhận tuyến nội bộ hoạt động; chạy [OIDC live check](../docs/GATEWAY-AND-SSO.md) và thực hiện:

- Đăng nhập thật, kiểm Kho thực hành và Kho vận hành có dữ liệu cũ.
- Mở lô, phiếu, lịch sử cảm biến và tệp đã quét sạch.
- Tạo hồ sơ mẫu, gửi duyệt, duyệt bằng tài khoản khác đúng vai trò.
- Tài khoản chỉ xem bị từ chối ghi; phiên hết hạn quay lại đúng màn hình sau đăng nhập.
- Kiểm camera trên điện thoại thật nếu dùng tính năng này.

## 5. Phục hồi trên môi trường riêng

Giữ nguyên backup gốc. Dùng cùng phiên bản mã được ghi trong `commit.txt`, cùng tên miền/khóa liên quan khi phục hồi. Với v0.0.5, **không chạy image trước migration trên DB đã nâng cấp**.

1. Dựng môi trường phục hồi riêng với volume mới, không trỏ vào volume đang vận hành.
2. Dừng app, core và identity. Chép **nội dung** thư mục `warehouse/` có `warehouse.sqlite`, `objects/`, `COMPLETE` vào volume kho gắn tại `/app/data`; cấp quyền cho UID/GID của tài khoản Node trong image (bản tham chiếu là 1000:1000).
3. Khởi động riêng identitydb. Nạp dump vào database `identity` **trống**; dùng `pg_restore --exit-on-error --no-owner -U keycloak -d identity`. Không nạp chồng hoặc dùng `--clean` trên DB đang phục vụ người dùng.
4. Khôi phục `.env` và cấu hình, kiểm callback/DNS/TLS. Chạy verifier trên bản phục hồi rồi khởi động dịch vụ.
5. Đối chiếu tài khoản, quyền, hai vùng kho, lô/phiếu, hồ sơ mở rộng, ledger và tệp. Chỉ chuyển lưu lượng sau khi đạt kiểm tra.

Rollback về trước v0.0.5 cần cả mã cũ và backup trước migration. Dữ liệu phát sinh sau thời điểm backup phải đối soát riêng; chỉ đổi tag hoặc image không hoàn tác dữ liệu.

## 6. Tích hợp tùy chọn

| Biến | Cách cấu hình |
| --- | --- |
| `WEBHOOK_URL`, `WEBHOOK_WORKSPACE`, `WEBHOOK_SECRET` | Compose đã truyền vào Core; HTTPS, secret ít nhất 32 ký tự, một workspace mỗi worker. [Hợp đồng webhook](../docs/PLATFORM.md#nhật-ký-và-webhook). |
| `FILE_SCAN_URL`, `FILE_SCAN_TOKEN` | Compose đã truyền vào Core; dịch vụ do người triển khai cung cấp, nhận byte tệp và trả `{clean:true}`. |
| `AI_API_KEY`, `AI_MODEL` | Runtime hỗ trợ Groq nhưng Compose mặc định chưa truyền; cần override environment của Core, không chỉ thêm `.env`. |

Ví dụ override AI, chỉ khi đơn vị chấp nhận gửi ngữ cảnh kho/SOP sang nhà cung cấp:

```yaml
services:
  core:
    environment:
      AI_API_KEY: ${AI_API_KEY:?}
      AI_MODEL: ${AI_MODEL:-llama-3.3-70b-versatile}
```

Lưu thành file override riêng, thêm `-f` vào mọi lệnh Compose tương ứng và giữ khóa trong `.env` được bảo vệ. Không có AI thì trợ lý vẫn tra SOP cục bộ. Không có scanner thì tệp mới bị cách ly và không tải xuống; bật scanner không tự quét lại tệp cũ.

## 7. Chẩn đoán

| Triệu chứng | Kiểm tra ưu tiên |
| --- | --- |
| 502 sau đăng nhập | Core/app có chạy không; quyền đọc `/app/selfhost`; `DX_CORE_URL`, token và log |
| 401 dù userinfo đúng email | Tuyến Caddy → signin → app → Core, header chuyển tiếp; health không chứng minh user context |
| signin không có `sh` | Dùng `docker inspect` và lọc đúng tên biến không nhạy cảm; không dump toàn bộ environment |
| Kho trống | Vùng kho, email lời mời trước đăng nhập lần đầu, project Compose/volume |
| Migration lỗi | Giữ backup, dừng ghi; đọc lỗi Core, không xóa DB hoặc volume |
| File 423 | Chưa quét sạch; kiểm dịch vụ scanner, không bỏ chặn để tải xuống |
| 409 / 503 | Tải lại hồ sơ hoặc thử lại có giãn cách đúng mã yêu cầu; không tự bỏ version guard |
