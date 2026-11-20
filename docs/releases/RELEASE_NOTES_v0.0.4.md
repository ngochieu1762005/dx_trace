# DX-TRACE v0.0.4 — Warehouse Navigation & Scanner Fixes

Bản cập nhật tập trung vào giao diện kho thống nhất, quét QR/mã vạch và sửa lỗi triển khai.

### Changed
- Hợp nhất điều hướng kho; bỏ giao diện diễn tập và ứng dụng phê duyệt riêng, giữ chức năng đề xuất/phê duyệt trong kho.
- Chuyển các đường dẫn cũ về giao diện kho tương ứng; cập nhật hướng dẫn thao tác thu hồi.

### Fixed
- Cải thiện đọc QR/mã vạch bằng camera và ảnh với ZXing TRY_HARDER, ưu tiên camera sau.
- Chuẩn hóa mã lô, tiền tố DXTRACE:LOT và mã UPC/EAN/GTIN khi đối chiếu; hiển thị kết quả chưa khớp thay vì đóng trình quét.
- Cho phép chọn lại cùng một ảnh để quét; bỏ kết quả ảnh trả về sau khi đóng trình quét.
- Không mở nhầm lô khi liên kết truy xuất không tồn tại; không cho chọn lô hết tồn để lập phiếu xuất.
- Sửa cấu hình claim email OIDC và quyền đọc mã nguồn của tài khoản chạy container.

### Tests
- Bổ sung kiểm thử hồi quy cho chuẩn hóa mã quét và đối chiếu lô.
- Build và 26 kiểm thử Node.js đã đạt trên bản sửa scanner; kiểm thử camera thực tế và SSO trên VPS cần thực hiện sau triển khai.

## Nâng cấp từ v0.0.3
1. Sao lưu dữ liệu và giữ nguyên `selfhost/.env`, Docker volumes.
2. Cập nhật mã nguồn lên tag `v0.0.4`; build và tạo lại các dịch vụ `core`, `app`, `signin` bằng đúng các tệp Compose đang sử dụng.
3. Đồng bộ thư mục `landing/` vào thư mục Caddy phục vụ. Áp dụng các route mới từ cấu hình mẫu, kiểm tra và reload Caddy; giữ các website khác.
4. Đăng nhập lại, kiểm tra giao nhận, truy xuất và quét mã trên thiết bị thực tế.

## Phạm vi
- Bản phát hành không tự cập nhật VPS.
- Tra cứu sản phẩm ngoài kho vẫn phụ thuộc dữ liệu của nhà cung cấp API. Chưa có luồng tự động mở form tạo lô ngay sau khi quét.
- Dữ liệu kho thực hành cũ được giữ lại; việc bỏ giao diện diễn tập không xóa dữ liệu đã lưu.

**Các thay đổi:** [#4](https://github.com/ngochieu1762005/dx_trace/pull/4), [#5](https://github.com/ngochieu1762005/dx_trace/pull/5).
**So sánh mã nguồn:** [v0.0.3...v0.0.4](https://github.com/ngochieu1762005/dx_trace/compare/v0.0.3...v0.0.4).
