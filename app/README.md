# Giao diện và router API

Giao diện kho được dựng bằng React và Vite. Thư mục `app/api` chứa router được máy chủ Node gọi trực tiếp. [Kiến trúc](../docs/HEADLESS-CORE.md) · [API](../docs/API.md).

| Tệp | Trách nhiệm |
| --- | --- |
| [console.tsx](console.tsx) | Điều hướng, vùng kho, tổng quan, biểu mẫu và thao tác kho |
| [platform.tsx](platform.tsx) | Mẫu mô hình, plan/apply, tạo hồ sơ, chuyển bước, lọc/tìm/phân trang |
| [impact.tsx](impact.tsx) | Đối soát thu hồi theo phiếu và điểm nhận |
| [scanner.tsx](scanner.tsx) | Camera/ảnh, bộ chọn kết quả, tra sản phẩm và tem QR |
| [globals.css](globals.css) | Bố cục responsive, bảng và các thành phần giao diện |
| [api/[...path]/route.ts](api/%5B...path%5D/route.ts) | HTTP API, kiểm đầu vào và ánh xạ lệnh ở server |
| [main.jsx](../selfhost/ui/main.jsx) | Điểm vào React |
| [session.mjs](../public/shared/session.mjs) | Phiên hết hạn, quay lại đúng đường dẫn/vùng kho |

## Điều hướng và trạng thái

Công cụ & quản trị hiển thị sẵn. Đề xuất nội bộ ở `#requests`, nghiệp vụ mở rộng ở `#platform`. Kho thực hành giữ `area=training` trên URL và API; kho vận hành bỏ tham số này. Đường dẫn phê duyệt/demo cũ chuyển hướng về giao diện thống nhất.

Mô hình mở rộng lấy tối đa 50 hồ sơ/trang, tìm kiếm debounce 250 ms, tự tải lại mỗi 30 giây khi tab hiển thị. CSV ở màn hình này chỉ xuất trang đang xem; CSV lô hàng xuất danh sách đang lọc. Không mô tả hai chức năng xuất giống nhau.

## Quy tắc khi sửa giao diện

Giữ mã yêu cầu khi thử lại cùng thao tác, kiểm trạng thái busy, trình bày lỗi 403 khác lỗi hết phiên 401. Không bỏ version khi chuyển bước. Phân quyền và điều kiện cuối cùng do API quyết định; một nút có thể bị server từ chối nếu hồ sơ đã thay đổi hoặc điều kiện không đạt.

Scanner giải mã trong browser rồi dùng `lib/scan.mjs` đối chiếu. Một mã có nhiều lô phải cho chọn; không có lô phải hiển thị trạng thái chưa khớp hoặc tra sản phẩm, không mở nhầm bản ghi. Cơ sở dữ liệu ngoài có thể không có sản phẩm.

## Kiểm tra thủ công

- Mở cùng lô từ danh sách, cảnh báo và QR; kiểm tra đúng vùng kho.
- Nhận trả một phần và đối chiếu số còn phải thu.
- Áp dụng mẫu mở rộng, tạo hồ sơ, lọc không có kết quả, tìm lại và chuyển trang khi đủ dữ liệu.
- Thử hai vai trò, phiên hết hạn, màn hình nhỏ và camera điện thoại thật.
- Khi mô hình yêu cầu người duyệt khác người tạo, dùng hai tài khoản; demo PC một danh tính không chứng minh được bước này.

Build bằng `npm run build`; demo bằng `npm run demo`. Không có script dev/hot reload mặc định. [Đóng góp](../CONTRIBUTING.md).

## Theo dõi một thao tác từ giao diện tới Core

Khi người dùng gửi một phiếu, biểu mẫu thu thập dữ liệu và gọi API cùng nguồn. Router kiểm phiên và chuyển yêu cầu tới nghiệp vụ tương ứng. Lần tải lại phải đọc được trạng thái Core vừa ghi. Dùng [bài kiểm phiên](../tests/session.test.mjs) cho trường hợp hết hạn và [bài kiểm API mô hình](../tests/platform-api.test.mjs) cho quyền đọc, ghi và chuyển bước.

Từ thư mục gốc, chạy `npm run build` để xác nhận giao diện biên dịch được, sau đó chạy `node --test tests/session.test.mjs tests/platform-api.test.mjs` để kiểm hai đường xử lý trên.
