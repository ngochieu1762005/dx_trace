# HDPI trong DX-TRACE

Một lô sữa chua đã giao đến hai cửa hàng thì bị phát hiện bảo quản sai nhiệt độ. Bốn thành phần H–P–D–I cùng xuất hiện trong cách kho xử lý lô này.

| Thành phần | Biểu hiện trong ứng dụng |
| --- | --- |
| **H · Human · Con người** | Nhân viên kho ghi nhận giao hàng, người thẩm định kết luận chất lượng, quản lý quyết định cách ly và duyệt thu hồi. |
| **P · Process · Quy trình** | Từ phiếu kiểm định không đạt, quản lý mở sự cố, xử lý phiếu chưa giao và thu hàng đã giao trước khi đóng hồ sơ. |
| **D · Data · Dữ liệu** | Mã lô nối nhà cung cấp, hạn dùng, số đo, phiếu giao, điểm nhận và lượng đã trả. Mã sản phẩm có thể dùng chung cho nhiều lô. |
| **I · Intelligence · Hỗ trợ quyết định** | Quy tắc nhiệt độ giúp phát hiện lô có vấn đề. Số liệu giao và nhận trả cho biết điểm nào còn thiếu hàng. Người quản lý chịu trách nhiệm về quyết định thu hồi. |

## Theo hồ sơ SUA-005 trong kho thực hành

1. Chọn **Kho thực hành**. Trong **Truy xuất**, tìm SUA-005 và ghi lại mã lô, điểm nhận và các phiếu liên quan. Nếu kho mẫu đã được chỉnh sửa, dùng số đang hiển thị.
2. Trong **Sự cố & thu hồi**, kiểm tra trạng thái duyệt trước khi ghi nhận trả. Với dữ liệu mẫu ban đầu, Long Biên đã nhận 30 hộp và trả 17, Tây Hồ nhận 20 và chưa trả. Còn phải thu **13 + 20 = 33 hộp**.
3. Đối chiếu phiếu giữ 12 hộp tại Thanh Xuân. Hàng vẫn ở kho nên xử lý bằng hủy phiếu chưa giao. Cộng 12 vào 33 sẽ làm sai số hàng đang ở ngoài kho.
4. Mở lịch sử để đối chiếu người thao tác và thời điểm với số lượng từng phiếu. Khi còn điểm nhận chưa trả đủ, giữ hồ sơ mở. Sau khi đóng hồ sơ, kiểm tra lại trạng thái lô trước khi lập phiếu mới.

## Kiểm tra theo vai trò

Dùng hai tài khoản thuộc cùng không gian trên bản có SSO để thử bước lập và thẩm định. Bản demo cục bộ có một danh tính chủ kho, thích hợp cho việc lần theo số liệu. Nếu thử kiểm định từ đầu, chọn một lô thực hành đang hoạt động để phân biệt bước kết luận không đạt với quyết định cách ly sau đó.

[Nhập và giao lô](warehouse-guide.md) · [Thiết bị và quy tắc cảnh báo](sensor-guide.md) · [Đóng hồ sơ thu hồi](recall-guide.md) · [Hướng dẫn nghiệm thu](evaluation.md)
