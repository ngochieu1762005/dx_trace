# DX-TRACE v0.0.2 — DX-OS Open-Core & SaaS Experience

> **Bản phát hành nguồn thứ hai** · 18/11/2026 · MIT License

DX-TRACE v0.0.2 nâng cấp nền tảng truy xuất và điều phối thu hồi thực phẩm thành kiến trúc **DX-OS Open-Core** có lõi nghiệp vụ headless, hai ứng dụng độc lập dùng chung danh tính và API, cùng website giới thiệu sản phẩm công khai.

## Highlights

- **Headless Core:** `core` là dịch vụ API riêng, sở hữu dữ liệu kho; `app` độc lập với dữ liệu trực tiếp.
- **Two applications:** DX-TRACE Warehouse và DX Approvals dùng chung SSO, workspace, phân quyền và API workflow.
- **Public product website:** `landing.example.org` giới thiệu sản phẩm; `app.example.org` chứa ứng dụng sau đăng nhập; `id.example.org` cung cấp Keycloak.
- **Identity experience:** theme Keycloak tùy chỉnh, giao diện responsive; có công cụ hỗ trợ cấu hình callback và tạo người dùng `warehouse`.
- **Ubuntu deployment:** cấu hình Caddy + Docker Compose không ảnh hưởng các website hiện hữu với cổng dịch vụ nội bộ; có script backup/validate/rollback Caddy.
- **Quality and documentation:** thêm kiểm thử headless, tài liệu kiến trúc, giới hạn và hướng dẫn triển khai.

## Upgrade / Nâng cấp

> Đọc [CHANGELOG.md](CHANGELOG.md) và [sổ tay triển khai SaaS trên Ubuntu](selfhost/DEPLOY_SAAS_UBUNTU.md) trước khi thay đổi máy chủ.

Không chạy lại setup và không xóa volumes. Sao lưu `selfhost/.env`, Keycloak PostgreSQL và dữ liệu kho ra ngoài VPS. Nếu chuyển subdomain, bổ sung `https://app.example.org/oauth2/callback` vào Keycloak client `dx-trace` trước khi sửa `APP_HOST`.

**Requirements:** Node.js 24 + pnpm 11.25.0 khi build/demo; Docker Engine + Docker Compose v2 cho tự triển khai; DNS và HTTPS hợp lệ. VPS 4 GB RAM là môi trường hạn chế tài nguyên.

**Notes:** Chỉ phát hành khi nguồn tải và kiểm thử CI đã qua; màn hình/login SSO trên môi trường thực cần kiểm tra với tài khoản `warehouse`. Chưa công bố khả năng tuân thủ pháp lý hoặc các thành phần DX-OS chưa triển khai.

**Mã nguồn:** https://github.com/<YOUR-ACCOUNT>/dx_trace

**Thay đổi so với v0.0.1:** https://github.com/<YOUR-ACCOUNT>/dx_trace/compare/v0.0.1...main

### Release asset đề xuất

- `DX-TRACE-v0.0.2.tar.gz` — toàn bộ mã nguồn phiên bản, **không** kèm `.env`, `node_modules`, dữ liệu người dùng hoặc secrets.
- `SHA256SUMS` — kiểm tra tính toàn vẹn nếu tải từ nơi khác.

> GitHub tự hiển thị thêm hai lựa chọn **Source code (zip)** và **Source code (tar.gz)** khi release được tạo từ tag `v0.0.2`. Không cần tải một gói có sẵn Node modules hay database.
