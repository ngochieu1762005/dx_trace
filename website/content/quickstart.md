# Bắt đầu nhanh

## Chọn cách cài

| Nhu cầu | Cấu hình | Cách mở |
| --- | --- | --- |
| Tự thử giao diện và dữ liệu mẫu | Node.js 24+, pnpm 11.25.0 | Mở ứng dụng trên máy cá nhân |
| Dùng hai tài khoản để lập và duyệt phiếu | Docker Compose và Keycloak | Đăng nhập vào bản triển khai riêng |
| Nâng cấp bản đang chạy | Bản sao lưu và đúng bộ tệp Compose đang dùng | Kiểm tra dịch vụ, rồi đăng nhập lại |

## Chạy trên máy cá nhân

Tải **Source code (zip)** từ [trang phát hành](https://github.com/ngochieu1762005/dx_trace/releases) rồi giải nén, hoặc dùng Git để lấy nhánh phát triển.

```bash
git clone https://github.com/ngochieu1762005/dx_trace.git
cd dx_trace
```

Trên Windows, macOS hoặc Linux, mở terminal tại thư mục có `package.json` và chạy:

```bash
node -v
npx --yes pnpm@11.25.0 install --frozen-lockfile
npm run demo
```

Lệnh cuối dựng giao diện rồi chạy máy chủ Ứng dụng. Giữ cửa sổ terminal mở và truy cập [Kho thực hành trên máy này](http://127.0.0.1:8080/?area=training#overview). Phiên demo dùng danh tính chủ kho cục bộ. Dữ liệu được lưu tại `selfhost/local-demo-data/` và được đọc lại ở lần chạy sau. Nhấn **Ctrl+C** để dừng.

### Kiểm tra lần đầu

1. Mở **Lô hàng**, tìm một lô trong danh sách và ghi mã lô.
2. Mở **Truy xuất**, tra cùng mã và đối chiếu tên hàng, hạn dùng và các điểm đã nhận.
3. Mở **Sự cố & thu hồi**, chọn hồ sơ liên quan nếu có và xem lượng đã giao, đã trả và còn phải thu.
4. Chuyển giữa **Kho thực hành / Kho vận hành** để kiểm tra đúng vùng dữ liệu trước khi ghi thông tin.

### Xử lý lỗi khi khởi động

| Hiện tượng | Cách kiểm tra |
| --- | --- |
| `node` chưa được nhận diện hoặc phiên bản cũ | Cài Node.js 24, mở lại terminal và chạy `node -v` |
| Không tìm thấy `package.json` | Chuyển vào thư mục gốc sau khi giải nén hoặc clone |
| Cổng 8080 đã được sử dụng | Dừng phiên demo đang mở hoặc xác định chương trình đang dùng cổng |
| Trình duyệt báo từ chối kết nối | Xem lỗi đầu tiên trong terminal, giữ máy chủ chạy rồi mở lại địa chỉ |
| Không có dữ liệu mong đợi | Kiểm tra bộ chuyển kho và đường dẫn có `?area=training` |

## Cài trên máy chủ

1. Chọn [Docker Compose](../../selfhost/README.md) cho máy mới hoặc [Ubuntu có Caddy](../../selfhost/DEPLOY_SAAS_UBUNTU.md) khi máy chủ đã phục vụ các trang khác.
2. Chuẩn bị tên miền ứng dụng và danh tính, cấu hình môi trường và tạo tài khoản kho. Đọc [cổng API và đăng nhập một lần](../../docs/GATEWAY-AND-SSO.md) trước khi nối dịch vụ.
3. Đăng nhập từ trình duyệt, kiểm tra **Tổng quan** và chạy [nghiệm thu](../../docs/ACCEPTANCE-2026.md) với hai tài khoản khi thử luồng kiểm định.
4. Với máy đã chạy, dùng [hướng dẫn vận hành và sao lưu](../../selfhost/OPERATIONS.md) trước khi nâng cấp.

## Thử AppKit v2

Trong **Nghiệp vụ mở rộng**, chọn **Gói nghiệp vụ · AppKit v2** và xem trước kế hoạch. Có thể kiểm tra gói mẫu từ thư mục gốc:

```bash
node tools/dxtrace.mjs bundle-lint examples/bundles/operations.json
node tools/dxtrace.mjs bundle-plan examples/bundles/operations.json
```

## Kiểm thử từ mã nguồn

```bash
npm test
python3 -m unittest discover -s tests -p '*_test.py'
```

Xem [hướng dẫn kiểm thử](../../docs/TESTING.md) để biết phạm vi của từng nhóm và cách đọc kết quả.

## Chọn bước tiếp theo sau lần mở đầu

Muốn thử luồng nhập–xuất, dùng hai lô cùng sản phẩm để tập phân biệt mã vạch và mã lô trong [hướng dẫn kho](warehouse-guide.md). Muốn xem ngay một quyết định quản lý có số liệu cụ thể, mở [hồ sơ HDPI](hdpi.md) và tính lượng hàng còn phải thu. Khi cần chứng minh hai người lập và duyệt độc lập, chuyển sang bản có SSO và hai tài khoản cùng không gian.
