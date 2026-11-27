# Hướng dẫn nghiệm thu và trình diễn

## Bằng chứng theo kịch bản

| Kịch bản | Kết quả cần quan sát |
| --- | --- |
| Dựng từ mã nguồn | Gói phát hành khớp mã băm. Bản cài khởi động được ngoài thư mục nguồn. |
| Đăng nhập và phân quyền | Hai người trong cùng kho mở được cổng truy xuất và cổng kiểm định. Máy chủ từ chối thao tác vượt quyền. |
| Cách ly lô và thu hồi | Lô bị chặn giao. Số đã trả và số còn phải thu khớp từng điểm nhận. |
| Mở rộng ứng dụng | Chủ kho xem kế hoạch, cài gói và mở được biểu mẫu. Mô hình không tương thích khiến cả giao dịch bị từ chối. |
| Kiểm chứng quyết định | Khóa công khai xác minh được chữ ký. Khi sửa dữ liệu mẫu, kết quả kiểm tra đổi sang không hợp lệ. |
| Sao lưu và phục hồi | Bản khôi phục trong môi trường riêng mở được hồ sơ và đối chiếu được dữ liệu. |

Ghi mã commit, môi trường và điều kiện kiểm cùng kết quả. [Kịch bản nghiệp vụ](../../docs/DEMO.md) · [Ma trận minh chứng](../../docs/EVIDENCE.md) · [Nghiệm thu bản triển khai](../../docs/ACCEPTANCE-2026.md)

## Một phép thử có thể lặp lại

Ghi commit, vùng kho, vai trò, mã lô và số lượng ban đầu. Với một phiếu giữ hàng trên lô đang hoạt động, lập kiểm định rồi cách ly lô bằng tài khoản có quyền. Thử xác nhận giao phiếu đang giữ. Ghi lại phản hồi, trạng thái phiếu và lượng hàng sau lần thử. Chỉ kết luận lệnh chặn giao đạt khi cả trạng thái và số lượng đều đúng. [Theo dõi cả bốn thành phần HDPI](hdpi.md).
