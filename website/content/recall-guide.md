# Kiểm định, cách ly và thu hồi

## Luồng nghiệp vụ

| Bước | Vai trò | Điều kiện | Kết quả |
| --- | --- | --- | --- |
| Tạo hồ sơ kiểm định | Theo model Quality | Lô và thông tin kiểm định | Hồ sơ nháp |
| Gửi thẩm định | Theo workflow | Bước chuyển hợp lệ | Chờ duyệt |
| Kết luận không đạt | Người có quyền, khác người tạo nếu model yêu cầu | Hồ sơ đủ điều kiện | rejected |
| Chuyển sự cố | Owner/manager | Mã lô khớp, chưa liên kết | Cách ly và liên kết sự cố |
| Phê duyệt thu hồi | Owner/manager | Sự cố pending | approved, lô recall |
| Đối soát | Người xử lý | Hủy phiếu reserved; nhận trả đủ delivered | Không còn phiếu phải xử lý |
| Đóng | Owner/manager | Sự cố approved, không còn reserved/delivered | closed; lô vẫn bị chặn |

## Ví dụ đối soát mẫu SUA-005

Trong bộ dữ liệu ban đầu: Long Biên nhận 30 hộp, đã trả 17; Tây Hồ nhận 20 hộp, chưa trả. Còn 33 hộp cần thu hồi. Phiếu 12 hộp ở Thanh Xuân chưa giao phải hủy riêng. Kiểm số liệu thực tế trước khi thao tác vì dữ liệu thực hành có thể đã thay đổi.

## Vì sao đóng sự cố có thể thất bại?

Core từ chối nếu sự cố chưa được duyệt hoặc vẫn còn phiếu chưa giao/đã giao chưa trả đủ. Không sửa trực tiếp trạng thái DB để bỏ qua điều kiện. Đóng sự cố không tự mở lại lô.

## Minh chứng

Lưu ID lô, sự cố, phiếu, số liệu trước/sau và kết quả audit. Không dùng trợ lý AI để tự quyết định an toàn thực phẩm. Đọc [Quality Portal](../../docs/QUALITY-PORTAL.md) và [quy trình vận hành](../../docs/OPERATING-WORKFLOWS.md).

## Bàn giao một hồ sơ đang thu hồi

Với từng điểm nhận, ghi mã phiếu, lượng đã giao, đã trả và phần còn thiếu. Bàn giao riêng danh sách phiếu giữ hàng cần hủy. Khi một điểm trả thêm, đối chiếu đúng phiếu trước khi ghi số mới để lần bàn giao sau có thể lần lại thay đổi. [Ví dụ HDPI với SUA-005](hdpi.md).
