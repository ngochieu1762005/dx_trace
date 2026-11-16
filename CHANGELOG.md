# Changelog

## 0.0.1 — Bản phát hành đầu tiên

DX-TRACE hỗ trợ kho thực phẩm truy xuất từng lô từ nhà cung cấp đến điểm nhận và theo dõi hàng thu hồi đến khi đối soát đủ số lượng.

- **Truy xuất và giao nhận.** Quét tem QR, tra mã vạch, lập phiếu xuất và xác định số hàng đã giao cho từng điểm nhận.
- **Giám sát và thu hồi.** Ghi nhận nhiệt độ từ đầu dò, cách ly lô, phê duyệt thu hồi và theo dõi số đã trả, số còn phải thu theo từng phiếu.
- **Kho thực hành.** Chạy trên PC bằng `npm run demo` với 16 lô, 40 phiếu giao nhận và bốn kịch bản diễn tập.
- **Triển khai trên máy chủ.** Cài bằng Docker Compose, đăng nhập qua Keycloak, phân quyền theo kho và sao lưu dữ liệu cùng tệp đính kèm.

## Unreleased — DX-OS headless architecture

- Split production deployment into a private, API-only core and a presentation-only web proxy. Core owns the SQLite warehouse volume.
- Add standalone Approvals application sharing OIDC session, workspace and workflow API with the Warehouse UI.
- Add an internal core access token, isolated-core integration tests and architecture documentation.
- Preserve the local workstation demo mode; production SSO requires Docker/Keycloak.
- No claim of dynamic BPMN, universal API gateway, GitOps or Lakehouse implementation.
