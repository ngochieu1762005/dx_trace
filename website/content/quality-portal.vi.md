# Cổng kiểm định chất lượng

Cổng kiểm định chạy trong dịch vụ riêng tại `/apps/quality/`. Người dùng mở cổng bằng phiên đăng nhập của ứng dụng kho. Giao diện gửi yêu cầu qua API dùng chung. Core giữ dữ liệu, kiểm quyền và ghi quyết định.

## Theo dõi một phiếu

1. Chủ kho cài mô hình kiểm định. Nhân viên lập phiếu cho một lô hàng trong kho thực hành và gửi thẩm định.
2. Người có quyền duyệt đăng nhập bằng tài khoản khác, mở đúng phiếu và ghi kết quả cùng lý do.
3. Với kết quả không đạt, người có quyền chọn cách ly và mở sự cố cho đúng lô. Kiểm tra mã sự cố trên phiếu và trạng thái lô ở cổng truy xuất.
4. Thử lập phiếu xuất cho lô đang cách ly. Core phải từ chối. Nhật ký giữ liên kết giữa quyết định, người thực hiện và lô hàng.

Có thể chạy bộ kiểm tự động từ thư mục gốc bằng `node --test tests/quality-portal.test.mjs`. Xem [quy trình thu hồi](recall-guide.md) để đối soát lượng hàng đã giao và đã nhận lại.
