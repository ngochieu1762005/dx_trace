<!-- SPDX-FileCopyrightText: 2026 DX-TRACE contributors
SPDX-License-Identifier: MIT
DX-TRACE project authors: Đặng Nhật Minh, Nguyễn Ngọc Hiếu
-->
# Giao diện đăng nhập Keycloak

Áp dụng cho Keycloak 26.4.7 trong cấu hình v0.2.0. **Theme mặc định của Keycloak dùng được đầy đủ**; theme `dxtrace` là lựa chọn trình bày, không phải cơ chế đăng nhập khác.

Theme nằm tại [themes/dxtrace/login](themes/dxtrace/login). Nó kế thừa biểu mẫu Keycloak; không thay thế quy trình xác thực. Không đồng nhất theme login với giao diện Admin Console sau đăng nhập.

## Dùng lại giao diện mặc định

1. Mở `https://id.example.org/admin/` bằng tài khoản quản trị.
2. Chọn realm `warehouse` → Realm settings → Themes.
3. Đặt Login theme về theme mặc định khả dụng (`keycloak` trong cấu hình tham chiếu), Save.
4. Nếu muốn đổi cả trang đăng nhập quản trị, lặp lại ở realm `master`.
5. Kiểm bằng cửa sổ riêng tư. Không cần xóa tài khoản, realm hoặc database.

## Bật theme DX-TRACE khi cần

Override Ubuntu gắn thư mục theme vào container. Tại `selfhost/`:

```bash
docker compose -f compose.yaml -f compose.ubuntu-edge.yaml config --quiet
docker compose -f compose.yaml -f compose.ubuntu-edge.yaml \
  up -d --no-deps --force-recreate identity
docker compose -f compose.yaml -f compose.ubuntu-edge.yaml \
  exec identity ls -l /opt/keycloak/themes/dxtrace/login/theme.properties
```

Sau đó chọn Login theme `dxtrace` trong realm cần thay. Với Compose mặc định không có override Ubuntu, phải thêm mount tương ứng trước; không kỳ vọng theme tự xuất hiện chỉ vì pull code.

## Kiểm tra và xử lý lỗi

| Hiện tượng | Cách kiểm |
| --- | --- |
| Không thấy theme | Kiểm mount và theme.properties, tạo lại identity |
| Theme không đổi | Cửa sổ riêng tư, cache tài nguyên; khởi động lại identity khi cần |
| Muốn quay lại | Đổi theme trong Realm settings, không sửa DB tài khoản |
| Sai mật khẩu admin | Theme không giải quyết; phục hồi tài khoản theo quy trình quản trị Keycloak của đơn vị |
| Đăng nhập kho 401/502 | Kiểm OIDC/proxy/Core theo [OPERATIONS](OPERATIONS.md), không quy lỗi cho theme |

Commit trên GitHub không tự đổi theme đang chọn trong realm hoặc nội dung đang phục vụ trên VPS.
