<!-- SPDX-FileCopyrightText: 2026 DX-TRACE contributors
SPDX-License-Identifier: MIT
DX-TRACE project authors: Đặng Nhật Minh, Nguyễn Ngọc Hiếu
-->
# Mẫu nghiệp vụ mở rộng

[AppKit](../docs/APPKIT.md) · [Mô hình JSON](../docs/PLATFORM.md) · [BPMN](../docs/BPMN.md)

Các mẫu dùng chung Core, danh tính và giao diện hồ sơ của DX-TRACE. Đây là cấu hình nghiệp vụ, không phải ứng dụng frontend độc lập hoặc plugin thực thi mã ngoài.

| Mẫu | Mô hình | Manifest AppKit | Mục đích |
| --- | --- | --- | --- |
| Bảo trì | [model.json](maintenance/model.json) | [app.json](maintenance/app.json) | Yêu cầu bảo trì, duyệt và hoàn thành |
| Mua sắm | [model.json](purchase/model.json) | [app.json](purchase/app.json) | Duyệt theo ngưỡng tiền và chuyển cấp |
| Chất lượng | [model.json](quality/model.json) | Chưa đóng gói manifest | Hồ sơ kiểm tra; mã lô là tham chiếu văn bản |
| Khách hàng | [model.json](customer/model.json) | Chưa đóng gói manifest | Tiếp nhận và xử lý yêu cầu |

## Cài từ giao diện

1. Chọn đúng Kho thực hành hoặc Kho vận hành bằng tài khoản owner.
2. Mở **Nghiệp vụ mở rộng**. Với mô hình, chọn thư viện mẫu hoặc nhập định nghĩa JSON; với manifest, mở bảng **Ứng dụng mở rộng · AppKit**.
3. Xem kế hoạch, kiểm phiên bản và các lý do từ chối trước khi áp dụng/cài.
4. Tạo hồ sơ thử, thực hiện từng bước bằng vai trò phù hợp; kiểm nhật ký và kết quả.

AppKit/BPMN được đóng gói từ v0.0.6. Không dán `app.json` vào ô định nghĩa mô hình: manifest bọc mô hình trong `spec.model`, còn `model.json` là định nghĩa trực tiếp. Không đổi workflow của mô hình đang có hồ sơ chưa kết thúc mà bỏ qua kiểm tra của máy chủ.

## Ví dụ client quản trị

[maintenance/client.mjs](maintenance/client.mjs) là ví dụ quản trị dùng kết nối loopback hoặc SSH tunnel đến Core, yêu cầu token nội bộ và danh tính thử được cho phép. Nó không phải SDK đăng nhập OAuth cho người dùng cuối. Không đưa token vào trình duyệt, manifest hoặc repository; không mở cổng Core ra Internet. Tích hợp qua phiên người dùng xem [API](../docs/API.md).

## Chạy gói bảo trì có đường dẫn riêng

Sau khi [dựng bản cài](../docs/build-from-source.md) và đưa `dxtrace` vào PATH, khởi động bản demo trên cổng 8080. Mở terminal ở thư mục gốc của repo và chạy:

```sh
dxtrace app validate ./examples/maintenance
dxtrace app install ./examples/maintenance
dxtrace app list
```

Mở `http://127.0.0.1:8080/maintenance` trong trình duyệt. Gói [app.yaml](maintenance/app.yaml) tham chiếu hai cấu trúc dữ liệu trong [schemas](maintenance/schemas/). Quan sát phiên bản trong danh sách ứng dụng trước khi thử nâng cấp. [Kịch bản đầy đủ](../docs/demo-guide.md) giải thích cách dùng hai tài khoản để lập và duyệt phiếu.
