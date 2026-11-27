<!-- SPDX-FileCopyrightText: 2026 DX-TRACE contributors
SPDX-License-Identifier: MIT
DX-TRACE project authors: Đặng Nhật Minh, Nguyễn Ngọc Hiếu
-->
# Quản lý kho và truy xuất

## Điều kiện ban đầu

Đăng nhập bằng tài khoản được cấp quyền owner, manager hoặc warehouse. Chọn Kho thực hành để thử trước. Viewer chỉ tra cứu.

## 1. Tạo đối tác

Tại danh mục đối tác, thêm một nhà cung cấp và một điểm nhận. Tên, liên hệ và địa chỉ phục vụ đối soát; không nhập thông tin cá nhân không cần thiết.

## 2. Nhập lô

Tạo lô với mã duy nhất, sản phẩm, nhà cung cấp, số lượng dương, đơn vị, hạn sử dụng, vị trí và khoảng nhiệt độ. Mã vạch là tùy chọn; tra Open Food Facts chỉ hỗ trợ nhận dạng sản phẩm, không thay thế dữ liệu lô.

Ví dụ: lô TEST-COLD-01, sữa chua, 50 hộp, bảo quản từ 2 đến 8 °C. Chọn hạn dùng tương lai thực tế. Kiểm tra mã lô và ngày trước khi lưu.

## 3. Giao hàng

Tạo phiếu giao nhận bằng ID lô và điểm nhận. Hệ thống giữ lượng hàng khả dụng khi phiếu ở reserved. Chỉ xác nhận giao khi phiếu chưa giao và lô còn hoạt động, chưa hết hạn. Hủy phiếu chưa giao để giải phóng lượng giữ.

| Trạng thái phiếu | Ý nghĩa |
| --- | --- |
| reserved | Đã giữ hàng, chưa giao |
| delivered | Đã giao, có thể phát sinh nhận trả khi thu hồi được duyệt |
| cancelled | Hủy phiếu chưa giao |
| returned | Đã nhận trả đủ toàn bộ phiếu |

## Truy xuất

Dùng mã lô hoặc QR để mở hồ sơ. Đối chiếu nhà cung cấp, phiếu giao nhận, điểm nhận, số đo bảo quản và sự cố liên quan. Nếu camera không khả dụng, nhập mã hoặc dùng ảnh QR. Mã sản phẩm có thể trùng giữa nhiều lô.

## Kiểm tra hoàn tất

- Số lượng khả dụng không âm.
- Không xuất được lô hết hạn hoặc bị cách ly.
- Phiếu và lịch sử ghi đúng kho đã chọn.
- Đối chiếu lượng giữ, đã giao và nhận trả tại báo cáo thu hồi.

[Quy trình thu hồi](recall-guide.md) · [API kho](api-reference.md).

## Thử với hai lô cùng mã vạch

Trong Kho thực hành, tạo hai lô cùng sản phẩm với mã lô và hạn dùng khác nhau. Quét mã vạch trên bao bì để nhận diện sản phẩm, rồi đối chiếu mã lô và hạn dùng trước khi chọn hàng để giao. Khi cần truy xuất một lần nhập cụ thể, quét tem QR của lô đó. Nếu tra cứu bên ngoài thiếu tên hàng, đọc nhãn và nhập thủ công.

Để kiểm tra lượng giữ, nhập 50 hộp, lập phiếu giữ 12 hộp và xem lại tồn khả dụng. Nếu chưa có nghiệp vụ khác, còn 38 hộp khả dụng. Hủy phiếu trước khi giao rồi kiểm tra lại 50 hộp. Với phiếu đã giao, xem hướng dẫn nhận trả trong hồ sơ thu hồi.
