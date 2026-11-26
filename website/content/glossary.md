# Thuật ngữ

| Thuật ngữ | Ý nghĩa |
| --- | --- |
| DX-OS Open-Core | Lõi chuyển đổi số dùng lại cho nhiều ứng dụng; ở DX-TRACE mã nguồn phân phối theo MIT |
| Workspace | Không gian dữ liệu, quyền và nhật ký độc lập |
| Training | Kho thực hành tách khỏi kho vận hành; query area=training |
| Headless Core | Dịch vụ nghiệp vụ không phụ thuộc vào frontend |
| Manifest | JSON khai báo mô hình, quyền, quy trình và metadata ứng dụng |
| Bundle | Gói nhiều manifest; áp dụng trong một transaction |
| Model / Record | Định nghĩa nghiệp vụ / hồ sơ cụ thể |
| Idempotency-Key | Mã thao tác dùng lại khi retry cùng nội dung |
| Optimistic locking | Từ chối ghi khi phiên bản đã thay đổi |
| Audit ledger | Chuỗi SHA-256 sự kiện; cần giữ checkpoint bên ngoài để kiểm tra sửa lại lịch sử |
| BPMN | Ký pháp quy trình; DX-TRACE hỗ trợ tập con được mô tả riêng |
| SSO | Đăng nhập dùng chung qua Keycloak và OAuth2 Proxy |
| RBAC | Phân quyền theo vai trò |
| Quarantine | Cách ly lô hoặc tệp, không cho xuất/tải khi chưa đủ điều kiện |
| SBOM | Danh mục thành phần phần mềm và phụ thuộc |
| PoF | Điều kiện minh chứng phần mềm nguồn mở; đối chiếu thể lệ chính thức |

## Mã nào dùng để tra việc gì?

**Mã sản phẩm** nhận diện mặt hàng trên bao bì. **Mã lô** phân biệt đợt nhập có hạn dùng và điều kiện bảo quản riêng. **Mã phiếu giao** xác định lần giao cho một điểm nhận. Khi cửa hàng trả một phần hàng, bắt đầu từ phiếu giao để ghi đúng lượng trả rồi đối chiếu số còn lại theo lô.
