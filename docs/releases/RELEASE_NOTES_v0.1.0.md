# DX-TRACE v0.1.0 — AppKit, Flowable và Evidence Engine

Bản phát hành ngày 27/11/2026 tổng hợp các nâng cấp trên main từ v0.0.7, bao gồm PR #38 và #39.

- **AppKit SDK và CLI** cài, kiểm tra, nâng cấp, rollback và gỡ ứng dụng theo workspace. Maintenance App minh họa ứng dụng độc lập với hai schema và route riêng. Trace, Quality và Maintenance dùng chung phiên Keycloak.
- **Truy xuất và kiểm định** kết nối phiếu không đạt với cách ly lô và chặn xuất. APISIX là gateway mặc định. Khi bật Flowable, các tác vụ song song, timer và quyết định duyệt hoặc từ chối thu hồi được thực thi trong engine. Ca gián đoạn có thể đồng bộ lại từ lịch sử.
- **Evidence Engine** ghi snapshot quyết định, liên kết danh tính, policy, phiên bản workflow, dữ liệu đầu vào và trạng thái kho. Khi cấu hình khóa, Core ký Ed25519 lúc ghi. CLI xuất gói tar.gz và xác minh offline bằng khóa công khai hoặc checkpoint độc lập.
- **Độ bền dữ liệu** bổ sung transactional outbox, retry, hàng đợi lỗi và khóa idempotency bền vững. Cold chain kết nối cảnh báo cảm biến, cách ly lô và luồng thu hồi.
- **Vận hành và tài liệu** bổ sung màn hình đăng nhập, demo H-P-D-I, tài liệu song ngữ, REUSE, bảng đối chiếu PoF, SBOM SPDX và kiểm thử cài từ source archive ngoài cây mã nguồn.

### Nâng cấp

Sao lưu dữ liệu trước khi nâng cấp. Flowable và ký bằng chứng cần bật overlay tương ứng. Bản ghi trước khi bật ký giữ nguyên lịch sử. Xem [hướng dẫn Ubuntu](https://github.com/ngochieu1762005/dx_trace/blob/v0.1.0/selfhost/OPERATIONS.md), [Evidence Engine](https://github.com/ngochieu1762005/dx_trace/blob/v0.1.0/docs/BUSINESS-DECISION-PROOF.md) và [toàn bộ thay đổi](https://github.com/ngochieu1762005/dx_trace/compare/v0.0.7...v0.1.0).

Tải DX-TRACE-v0.1.0.tar.gz, DX-TRACE.spdx.json và SHA256SUMS vào cùng thư mục, sau đó chạy `sha256sum -c SHA256SUMS`.
