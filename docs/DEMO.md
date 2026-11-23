# Hướng dẫn trình diễn và kiểm chứng

[Trang chủ tài liệu](README.md) · [Ma trận minh chứng](EVIDENCE.md) · [Kiểm thử](TESTING.md)

Kịch bản dành cho người lần đầu xem DX-TRACE, dự kiến 12–15 phút. Thực hiện trong **Kho thực hành**. Thao tác vẫn được lưu, vì vậy số liệu có thể khác bộ mẫu ban đầu; không reset dữ liệu đang dùng chỉ để khớp kịch bản.

## Chuẩn bị

1. Chọn bản cần trình diễn: tag v0.0.5 cho bản phát hành, hoặc commit `main` để có AppKit/BPMN. Ghi lại `git rev-parse HEAD`.
2. Chạy theo [README](../README.md#quick-setup). Demo cục bộ có danh tính owner, không cần Keycloak và không chứng minh SSO.
3. Nếu trình diễn SSO/quyền, dùng bản Docker đã cấu hình và tài khoản thực của ít nhất hai vai trò. Không đưa mật khẩu vào slide hoặc repository.
4. Kiểm tra camera/HTTPS trước buổi trình diễn. Chuẩn bị ảnh QR do chính hệ thống tạo để có phương án thay thế.

## Luồng chính

| Thời lượng | Thao tác | Kết quả cần chỉ ra |
| --- | --- | --- |
| 1 phút | Mở Tổng quan, xác nhận Kho thực hành | Cảnh báo gắn với lô/sự cố, dữ liệu riêng với Kho vận hành |
| 2 phút | Mở Lô hàng, lọc hạn dùng và xem tồn; thử tra mã sản phẩm | Barcode hỗ trợ nhập nhanh, người nhập kiểm lại thông tin và bổ sung dữ liệu riêng của lô |
| 2 phút | Mở Truy xuất, tạo tem QR cho lô đang có và quét lại | Đúng lô, đúng lịch sử giao nhận; mã sản phẩm có thể khớp nhiều lô |
| 4 phút | Mở sự cố SUA-005, xem điểm đã nhận/đã trả/phiếu chưa giao | Hàng cần thu hồi và hàng giữ trong kho được đối soát riêng; các bước xử lý có quyền |
| 2 phút | Dùng hai vai trò phù hợp trên bản SSO, xem đề xuất và nhật ký | Người dùng chỉ thực hiện hành động được cấp quyền; thao tác có người và thời gian |
| 3 phút | Trên main: vào Nghiệp vụ mở rộng, cài manifest bảo trì hoặc mua sắm | Plan trước install, biểu mẫu sinh từ mô hình, quy trình dùng chung Core |
| 1 phút | Trình bày kiến trúc và giới hạn | Core độc lập, dữ liệu tự lưu; BPMN là tập con, không có HA mặc định |

Mẫu AppKit nằm tại [bảo trì](../examples/maintenance/app.json) và [mua sắm](../examples/purchase/app.json). Không cài lại định nghĩa lên mô hình có hồ sơ đang chạy mà bỏ qua cảnh báo kế hoạch. Quy tắc `differentActor` cần người duyệt khác người tạo; một tài khoản owner không thay thế được minh chứng hai người.

## Minh chứng ứng dụng độc lập (nhánh nâng cấp, ngoài v0.0.5)

Mở `/apps/quality/` khi đã triển khai service `quality-portal` sau lớp đăng nhập. Chủ không gian cài ứng dụng từ manifest; nhân viên nhập phiếu, gửi thẩm định; tài khoản người tạo bị chặn tự phê duyệt và tài khoản quản lý **khác người** duyệt được. Đối chiếu hồ sơ trong **Nghiệp vụ mở rộng**, sau đó dừng duy nhất frontend thứ hai và xác nhận lõi vẫn trả API thành công. [Từng bước](QUALITY-PORTAL.md).

Nếu chỉ chạy `npm run demo` cục bộ, chưa có service thứ hai và không được tuyên bố đã kiểm SSO. Các lệnh kiểm tự động chạy trên loopback dùng identity giả lập có chủ đích; cần trình diễn Keycloak bằng tài khoản thật khi báo cáo.

## Đối soát bộ mẫu

Ở trạng thái mẫu ban đầu, SUA-005 có Long Biên nhận 30, trả 17; Tây Hồ nhận 20, chưa trả; Thanh Xuân giữ phiếu 12 chưa giao. Còn cần nhận trả **33 hộp** và xử lý riêng phiếu 12 hộp chưa giao. Luôn đọc số hiện tại trên giao diện trước khi trình bày.

## Khi dịch vụ ngoài không sẵn sàng

- Tra sản phẩm thất bại: nhập thủ công; không tuyên bố API đã trả kết quả.
- Camera không được cấp quyền: dùng ảnh hoặc nhập mã; ghi rõ đây là phương án thay thế.
- Không bật Groq: minh họa trợ lý cục bộ, không gọi là câu trả lời của LLM.
- Không cấu hình scanner: giải thích tệp bị cách ly, không minh họa tải tệp như đã quét sạch.

## Biên bản sau trình diễn

Ghi commit, ngày, môi trường, vai trò, kịch bản đạt/chưa đạt và lỗi thực tế. Không ghi cookie, token, mật khẩu hoặc dữ liệu cá nhân. CI, demo và thử nghiệm vận hành là ba loại bằng chứng khác nhau; xem [EVIDENCE](EVIDENCE.md).
