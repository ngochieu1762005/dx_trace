<!-- SPDX-FileCopyrightText: 2026 DX-TRACE contributors
SPDX-License-Identifier: MIT
DX-TRACE project authors: Đặng Nhật Minh, Nguyễn Ngọc Hiếu
-->
# Triển khai DX-TRACE bằng Docker Compose

Hướng dẫn này dành cho **máy chủ mới**. Cấu hình cơ sở khởi chạy ứng dụng kho, Core, cổng API, Keycloak và các dịch vụ phụ thuộc. Nếu Caddy đang phục vụ nhiều website trên máy, chọn [cấu hình Ubuntu dùng Caddy sẵn có](DEPLOY_SAAS_UBUNTU.md). Với hệ thống đã có người dùng, làm theo [quy trình nâng cấp và sao lưu](OPERATIONS.md).

## Chuẩn bị

- Linux, Docker Engine và Compose v2; Node.js 24 để tạo cấu hình lần đầu.
- Hai tên miền khác nhau đã trỏ tới máy chủ: `app.example.org`, `id.example.org`.
- Cổng 80/443 cho Caddy, kết nối Internet để tải image/gói và cấp chứng chỉ.
- Cấu hình tham khảo: 4 vCPU, 16 GB RAM, 30 GB SSD trống; điều chỉnh theo dữ liệu và tải thực tế. Đây không phải mức tối thiểu được đo tải.

## Cài từ mã nguồn

```bash
git clone --branch v0.2.0 https://github.com/ngochieu1762005/dx_trace.git
cd dx_trace
node selfhost/setup.mjs app.example.org id.example.org
cd selfhost
docker compose config --quiet
docker compose up -d --build
docker compose ps
```

Thay hai tên miền trước khi chạy. Ghi lại `git rev-parse HEAD`; lệnh trên chọn v0.2.0 để các lần cài dùng cùng phiên bản. Setup tạo `selfhost/.env` với quyền 0600 và không ghi đè tệp đã tồn tại. Container app không gắn DB; Core riêng giữ volume kho và không publish cổng host.

| Biến bắt buộc | Vai trò |
| --- | --- |
| `APP_HOST`, `ID_HOST` | Tên miền không kèm `https://`, dùng cho issuer và callback |
| `ADMIN_PASSWORD` | Mật khẩu bootstrap admin Keycloak; không phải mật khẩu kho |
| `DB_PASSWORD` | PostgreSQL của Keycloak |
| `OIDC_CLIENT_SECRET` | Bí mật client `dx-trace` |
| `COOKIE_SECRET` | Bảo vệ cookie OAuth2 Proxy |
| `DX_CORE_TOKEN` | Token nội bộ Gateway/Core, tối thiểu 32 ký tự ngẫu nhiên |
| `DX_GATEWAY_APP_TOKEN` | Token khác biệt dành cho App/Gateway, tự tạo bởi setup mới |

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

## Kiểm tra sau lần cài đầu

Mở tên miền ứng dụng bằng cửa sổ riêng tư. Truy cập kho phải chuyển sang Keycloak. Đăng nhập rồi mở cổng kiểm định trong cùng phiên. Kiểm tra tên kho và vai trò trước khi tạo một phiếu mẫu. Dùng thành viên thứ hai khi quy trình yêu cầu người duyệt khác người tạo.

Để phân biệt lỗi dịch vụ với lỗi quyền, xem trạng thái bằng `docker compose ps` với cùng bộ tệp cấu hình đã dùng để khởi động. Khi dịch vụ đã chạy, đối chiếu mã trả về của API với [hướng dẫn xác thực](../website/content/api-auth.md). [Nghiệm thu bản triển khai](../website/content/acceptance.vi.md)
