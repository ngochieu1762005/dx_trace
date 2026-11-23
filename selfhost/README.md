# Triển khai DX-TRACE v0.0.5

Hướng dẫn cài mới bằng Docker Compose. Nếu máy đã có Caddy/Nginx chiếm cổng 80/443, dùng [hướng dẫn Ubuntu có Caddy](DEPLOY_SAAS_UBUNTU.md). Máy đang vận hành dùng [quy trình cập nhật và backup](OPERATIONS.md), không chạy lại setup.

## Chuẩn bị

- Linux, Docker Engine và Compose v2; Node.js 24 để tạo cấu hình lần đầu.
- Hai tên miền khác nhau đã trỏ tới máy chủ: `app.example.org`, `id.example.org`.
- Cổng 80/443 cho Caddy, kết nối Internet để tải image/gói và cấp chứng chỉ.
- Cấu hình tham khảo: 4 vCPU, 16 GB RAM, 30 GB SSD trống; điều chỉnh theo dữ liệu và tải thực tế. Đây không phải mức tối thiểu được đo tải.

## Cài từ mã nguồn

```bash
git clone --branch v0.0.5 https://github.com/ngochieu1762005/dx_trace.git
cd dx_trace
node selfhost/setup.mjs app.example.org id.example.org
cd selfhost
docker compose config --quiet
docker compose up -d --build
docker compose ps
```

Thay hai tên miền trước khi chạy. Clone theo tag giúp tái lập release; muốn phát triển dùng nhánh `main`. Setup tạo `selfhost/.env` với quyền 0600 và không ghi đè tệp đã tồn tại. Container app không gắn DB; Core riêng giữ volume kho và không publish cổng host.

| Biến bắt buộc | Vai trò |
| --- | --- |
| `APP_HOST`, `ID_HOST` | Tên miền không kèm `https://`, dùng cho issuer và callback |
| `ADMIN_PASSWORD` | Mật khẩu bootstrap admin Keycloak; không phải mật khẩu kho |
| `DB_PASSWORD` | PostgreSQL của Keycloak |
| `OIDC_CLIENT_SECRET` | Bí mật client `dx-trace` |
| `COOKIE_SECRET` | Bảo vệ cookie OAuth2 Proxy |
| `DX_CORE_TOKEN` | Token nội bộ app/Core, tối thiểu 32 ký tự ngẫu nhiên |

Các khóa được setup tạo tự động. Không in `.env` lên issue/log công khai. Thay biến bootstrap sau khi Keycloak đã khởi tạo không phải cách đổi mật khẩu admin hiện tại.

## Tạo tài khoản và cấp quyền

1. Mở `https://id.example.org/admin/`, đăng nhập `admin` với mật khẩu bootstrap được lưu riêng.
2. Chọn realm **warehouse** → Users. Tạo tài khoản chủ kho có email hợp lệ và đặt mật khẩu ở Credentials. Chỉ bật Email verified sau khi đã xác minh email.
3. Dùng tài khoản đó đăng nhập `https://app.example.org/`; hệ thống tạo kho riêng nếu chưa có lời mời.
4. Với người cần dùng chung kho, chủ kho vào **Cài đặt không gian → Thêm thành viên**, mời đúng email **trước lần đăng nhập đầu tiên**; tạo danh tính tương ứng trong Keycloak.
5. Dùng nút **Kho thực hành / Kho vận hành**. Liên kết thực hành trực tiếp là `https://app.example.org/?area=training#overview`.

| Vai trò | Phạm vi điển hình |
| --- | --- |
| `owner` | Thành viên, cấu hình, áp dụng mô hình và nghiệp vụ kho |
| `manager` | Duyệt thu hồi, quản lý thiết bị, xử lý hồ sơ theo model |
| `warehouse` | Nhập/giao/nhận trả theo điều kiện; hồ sơ theo quyền cấu hình |
| `viewer` | Tra cứu; model mở rộng chỉ hiển thị nếu định nghĩa cho phép đọc |

Quyền Keycloak admin khác quyền owner của kho. Realm mặc định không tự đăng ký. Hệ thống hiện không cung cấp bộ chọn nhiều tổ chức cho một danh tính; mời người đã thuộc kho khác có thể trả 409.

## Ứng dụng kiểm định độc lập (nhánh nâng cấp)

Compose có thêm service `quality-portal` (không công bố cổng ra host, không gắn database/volume kho). Sau khi triển khai **đúng commit hỗ trợ**, mở `https://app.example.org/apps/quality/` qua cùng phiên đăng nhập Keycloak. Chủ không gian cài manifest phiên bản 1.0.0 từ giao diện để bật mô hình. Nếu portal không chạy, frontend trả 503 cho route này nhưng kho và Core vẫn hoạt động. Xem [tài liệu và kịch bản kiểm thử](../docs/QUALITY-PORTAL.md).

Trên VPS đang chạy, hãy sao lưu, kiểm tra Compose và dùng quy trình nâng cấp trong [OPERATIONS](OPERATIONS.md) trước khi dựng lại các container. **Không** chạy lại setup hoặc thay đổi mật khẩu Keycloak chỉ để bật ứng dụng.

## Kiểm tra sau cài đặt

- Đăng nhập mới qua OIDC và quay lại đúng kho; thử phiên hết hạn.
- Hai tài khoản chung kho có quyền phù hợp; viewer bị API từ chối ghi.
- Hai vùng dữ liệu không trộn nhau; mẫu SUA-005 chỉ xuất hiện ở kho thực hành mới khởi tạo.
- Core không có cổng public; `docker compose logs --tail=80 core app signin` không báo lỗi.
- Kiểm camera trên HTTPS và một thao tác nghiệp vụ hoàn chỉnh.

[Hướng dẫn giao diện đăng nhập](BRANDED_LOGIN.md) · [Kiểm tra vận hành](OPERATIONS.md#4-kiểm-tra-sau-nâng-cấp).

## Kết nối đầu dò

Trong **Thiết bị**, tạo đầu dò gắn với lô và lưu khóa hiển thị một lần. Ví dụ Bash:

```bash
read -rsp 'Khóa thiết bị: ' SENSOR_TOKEN
echo
recorded=$(date -u +%Y-%m-%dT%H:%M:%SZ)
sample_id=$(cat /proc/sys/kernel/random/uuid)
curl --fail-with-body https://app.example.org/api/ingest \
  -H "Authorization: Bearer ${SENSOR_TOKEN}" \
  -H 'Content-Type: application/json' \
  --data "{\"id\":\"${sample_id}\",\"temperature\":4.5,\"recorded\":\"${recorded}\"}"
unset SENSOR_TOKEN
```

Đồng bộ đồng hồ UTC; server kiểm cửa sổ thời gian 10 phút. Khi gửi lại, giữ ID và nội dung phép đo. Thu hồi khóa trong giao diện nếu không dùng nữa. Không ghi khóa vào Git hoặc frontend.

## Bước tiếp theo

[Backup và nâng cấp](OPERATIONS.md) · [API](../docs/API.md) · [Mô hình và webhook](../docs/PLATFORM.md) · [Giới hạn kiến trúc](../docs/HEADLESS-CORE.md).
