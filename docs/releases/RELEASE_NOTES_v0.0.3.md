# DX-TRACE v0.0.3 — Product Experience & Session Recovery

**Bản phát hành nguồn mở thứ ba · 18/11/2026 · MIT License**

Bản 0.0.3 nâng cấp giao diện giới thiệu và củng cố đường dẫn đăng nhập dùng chung DX-TRACE Warehouse / DX Approvals. Nền tảng DX-OS Open-Core tiếp tục sử dụng Headless Core API, Keycloak OIDC, Docker Compose và dữ liệu kho độc lập.

## Highlights

- **Landing page mới:** giao diện responsive, minh họa vụ thu hồi lô SUA-005 và lộ trình xử lý từ phát hiện, xác định phạm vi tới đối soát.
- **Điều hướng rõ ràng:** ba lối vào `/login`, `/try`, `/approvals` trên landing chuyển về đúng khu vực ứng dụng qua OAuth2 Proxy.
- **Session recovery:** người dùng đăng nhập lại có thể quay về đúng hồ sơ/lô, khu vực dữ liệu và luồng phê duyệt. Phân biệt 401 hết hạn và 403 thiếu quyền.
- **Tương thích triển khai:** bản Caddy template và trình cập nhật có kiểm tra quyền đọc static files, hỗ trợ dry-run, validation và rollback; không can thiệp website khác.
- **Kiểm thử:** CI bổ sung Node.js session tests và Python routing tests; README và hình ảnh dự án cập nhật.

## Upgrade from v0.0.2

1. Sao lưu cấu hình `.env`, dữ liệu kho, Keycloak/PostgreSQL và các tệp đính kèm trước khi triển khai. **Không xóa Docker volumes**.
2. Cập nhật repository, build lại `core`, `app` và `signin`.
3. Landing là tệp tĩnh: đồng bộ thư mục `landing/` lên thư mục static được Caddy phục vụ; nếu dùng host Caddy, cập nhật route `/login`, `/try`, `/approvals` theo tài liệu [selfhost/DEPLOY_SAAS_UBUNTU.md](../../selfhost/DEPLOY_SAAS_UBUNTU.md).
4. Kiểm tra landing HTTP 200, các đường dẫn đăng nhập HTTP 302, và luồng đăng nhập thực tế quay đúng trang đích.

**Mã nguồn này không kèm IP, thông tin VPS cá nhân, mật khẩu, `.env`, cơ sở dữ liệu hay dữ liệu người dùng.** Ba website của nhóm chỉ được mô tả trong README dưới dạng demo tham khảo, không phải cấu hình mặc định để người khác sao chép.

Chi tiết thay đổi: [CHANGELOG.md](../../CHANGELOG.md). Đối chiếu thay đổi với bản trước: [v0.0.2...v0.0.3](https://github.com/ngochieu1762005/dx_trace/compare/v0.0.2...v0.0.3).
