# Đóng gói ứng dụng bằng AppKit

Manifest mô tả mã ứng dụng, phiên bản, mô hình dữ liệu và quy trình. Core dùng khai báo này để tạo biểu mẫu, kiểm quyền và lưu hồ sơ trong đúng kho. Gói bảo trì minh họa cách thêm ứng dụng mà không sửa mã Core.

## Chọn định dạng

| Tệp đầu vào | Cách sử dụng |
| --- | --- |
| `model.json` | Xem trước và áp dụng một mô hình trong màn hình nghiệp vụ mở rộng |
| `app.json` | Kiểm tra manifest AppKit v1 bằng lệnh `node tools/dxtrace.mjs lint examples/maintenance/app.json` |
| Thư mục có `app.yaml` | Dùng bản cài CLI để kiểm tra, cài, nâng cấp, quay lại phiên bản trước hoặc gỡ ứng dụng |

## Kiểm tra ứng dụng sau khi cài

Chủ kho mở bản xem trước, đối chiếu trường dữ liệu và vai trò rồi cài gói. Với ứng dụng bảo trì, mở `/maintenance`, tạo phiếu và gửi duyệt. Dùng một tài khoản quản lý khác để kiểm tra bước phê duyệt. [Hướng dẫn cài từ đầu](../../docs/demo-guide.md) trình bày cả kết quả sau khi gỡ.

SDK JavaScript dành cho ứng dụng gọi API. Việc cài gói vào một kho do AppKit CLI thực hiện. [API tích hợp và SDK](../../docs/EXTERNAL-API-V2.md)
