# Lộ trình sử dụng DX-TRACE

Chọn đúng môi trường trước khi thao tác. Kho thực hành có dữ liệu mẫu, kho vận hành là dữ liệu thật. Không reset kho để tạo lại demo.

| Đối tượng | Bước 1 | Bước 2 | Bước 3 | Kết quả |
| --- | --- | --- | --- | --- |
| Nhân viên kho | [Tài khoản](identity-guide.md) | [Nhập và giao lô](warehouse-guide.md) | [Truy xuất](warehouse-guide.md#truy-xuất) | Tìm đúng lô, xuất đúng số lượng |
| Quản lý | [Phân quyền](identity-guide.md) | [Kiểm định và thu hồi](recall-guide.md) | [Audit](../../docs/AUDIT-EVIDENCE.md) | Đối soát và lưu minh chứng |
| Developer | [Quick Start](quickstart.md) | [Tutorial](app-tutorial.md) | [API Reference](api-reference.md) | Cài mô hình độc lập |
| DevOps | [Checklist](deployment-checklist.md) | [Docker](../../selfhost/README.md) | [Backup](backup-restore.md) | Vận hành và phục hồi |
| Người đánh giá | [Kiến trúc](architecture-map.md) | [Ma trận](capability-matrix.md) | [Nghiệm thu](evaluation.md) | Phân biệt kết quả kiểm thử và giới hạn |

## Nguyên tắc sử dụng

1. Kiểm tra commit đang chạy và phạm vi dữ liệu.
2. Thử thao tác mới trong kho thực hành.
3. Không chia sẻ token, mật khẩu, dữ liệu người dùng hoặc bản sao lưu.
4. Đối chiếu kết quả nghiệp vụ trên màn hình và nhật ký.

## Bắt đầu một ca làm việc trong kho

Người giao ca đưa mã một lô đang xử lý và mã phiếu liên quan. Người nhận ca tra lại bằng tài khoản của mình, xác nhận đang ở đúng kho và đối chiếu lượng đã giao, còn giữ hoặc cần thu. Nếu hai bên thấy số khác nhau, đối chiếu thời điểm và từng phiếu trước khi sửa dữ liệu. [Xem ví dụ đối soát](hdpi.md).
