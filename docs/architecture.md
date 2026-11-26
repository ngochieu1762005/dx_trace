# Nguồn trạng thái và biên dịch vụ

| Nghiệp vụ | Nguồn trạng thái | Điểm đồng bộ |
| --- | --- | --- |
| Portal truy xuất, kiểm định và ứng dụng bảo trì | Phiên Keycloak qua OAuth2 Proxy, workspace và role tại Core | APISIX nhận credential dịch vụ, định tuyến, áp quota. JWT client bên ngoài do external-api kiểm tra. |
| AppKit Application | Schema và BPMN subset đã biên dịch vào model DX-TRACE trong SQLite | Cài, nâng cấp, rollback hoặc gỡ cập nhật route logic, model, quyền, lịch sử và audit trong cùng transaction. |
| Hồ sơ chất lượng ở Quality Portal hiện hữu | Model kiểm định và các transition của Core | API escalate ghép hồ sơ không đạt với sự cố kho trong một transaction. Với overlay, sự cố mới sử dụng Flowable cho quyết định thu hồi; sự cố đang mở giữ engine đã gắn. |
| Ca thu hồi tạo bằng quality-recalls | Flowable trên PostgreSQL quyết định các task, timer, vai trò tác vụ và kết quả accepted/rejected. Core kiểm role và cấm tự duyệt trước khi chuyển yêu cầu. | Core cách ly ngay khi ghi nhận không đạt. Instance gắn với incident. Hoàn tất hoặc sync đọc history từ Flowable và chiếu kết quả sang lô. |
| Tồn kho, chặn giao, lịch sử lô | SQLite và audit ledger của Core | API giao hàng đọc trạng thái lô đã commit. Kết quả từ chối thu hồi giữ lô cách ly. |
| Tệp minh chứng | Object store theo nội dung trên volume Core | Metadata và hash lưu trong Core. |

APISIX là gateway mặc định của Compose. Flowable cần [overlay](../selfhost/compose.third-party.yaml). PostgreSQL hiện phục vụ danh tính và workflow trong các DB riêng. Runtime model nội bộ tiếp tục xử lý AppKit và hồ sơ cũ. Luồng thu hồi mới chỉ cho phép Flowable quyết định phê duyệt. Việc trực tiếp gọi API duyệt sự cố bị chặn cho các ca này.

[Headless Core](HEADLESS-CORE.md) · [Nghiệm thu](demo-guide.md)
