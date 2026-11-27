# Kiểm tra chất lượng dữ liệu của mô hình

Trường văn bản có thể khai báo `minLength` và `maxLength` trong khoảng 1–4.000 ký tự. Điều kiện `requiredWhen` cho phép bắt buộc nhập một trường theo giá trị trường khác. Ví dụ, mô hình có thể yêu cầu lý do khi mức ưu tiên bằng “Khẩn cấp”.

## Xem trước thay đổi

Khi chủ kho lập kế hoạch sửa mô hình, máy chủ kiểm tên trường, giá trị tham chiếu và sự tương thích với hồ sơ hiện có. Định nghĩa OpenAPI 3.0 xuất điều kiện bắt buộc dưới dạng thuộc tính mở rộng.

## Đọc thống kê

`GET /api/catalog/{model}/profile` trả số lượng giá trị đã điền và lần cập nhật gần nhất trong phạm vi người gọi được đọc. Kết quả là số tổng hợp. Một trường tùy chọn để trống vẫn có thể là hồ sơ hợp lệ.
