<!-- SPDX-FileCopyrightText: 2026 DX-TRACE contributors
SPDX-License-Identifier: MIT
DX-TRACE project authors: Đặng Nhật Minh, Nguyễn Ngọc Hiếu
-->
# Quy tắc nghiệp vụ và lưu trữ

Các quy tắc được thực thi ở Core, không chỉ ở giao diện. [Router HTTP](../app/api/%5B...path%5D/route.ts) · [Kiến trúc](../docs/HEADLESS-CORE.md).

| Module | Trách nhiệm |
| --- | --- |
| [domain.mjs](domain.mjs) | Lệnh nhập/giao/hủy/nhận trả, sự cố, thiết bị, SOP và điều kiện tồn |
| [server.ts](server.ts) | Thành viên, tổ chức/vùng kho, snapshot và ghi JSON theo revision |
| [workspace-queue.mjs](workspace-queue.mjs) | Hàng đợi ghi cùng workspace, tối đa 100 lượt đang chờ/xử lý |
| [impact.mjs](impact.mjs) | Đối soát thu hồi đọc từ các phiếu |
| [inventory-view.mjs](inventory-view.mjs) | Lọc tồn/hạn dùng, FEFO và CSV có bảo vệ công thức |
| [scan.mjs](scan.mjs) | Chuẩn hóa QR/barcode, đối chiếu lô |
| [workflow.mjs](workflow.mjs) | Workflow đề xuất nội bộ định nghĩa trong source |
| [platform.mjs](platform.mjs) | Kiểm mô hình/giá trị, plan/apply, workflow JSON và OpenAPI |
| [platform-store.ts](platform-store.ts) | SQL theo quyền, phân trang và ghi hồ sơ/ledger cùng transaction |
| [demo.mjs](demo.mjs) | Khởi tạo và nâng cấp bộ mẫu thực hành |

## Một lần ghi

API xác định context → kiểm mã yêu cầu → vào hàng đợi workspace → đọc revision/model/record → kiểm vai trò và quy tắc → ghi dữ liệu, kết quả yêu cầu và ledger trong transaction. Revision bảo vệ cạnh tranh ngoài process; version hồ sơ chặn quyết định trên bản cũ. Lỗi 503 báo hàng đợi đầy, không phải thành công được trì hoãn ngầm.

Kho truyền thống giữ 600 khóa yêu cầu gần nhất trong JSON. Hồ sơ mở rộng dùng `platform_commands`; chưa có dọn lịch sử tự động. Snapshot kho loại requests/models/records; muốn đọc hồ sơ mở rộng phải dùng `/api/models` để giữ phạm vi quyền.

## Quy tắc thu hồi

Tách số đã giao, đã trả, còn phải thu và hàng giữ trên phiếu chưa giao. Phiếu hủy không tính vào phạm vi; hàng chưa giao được hủy riêng. Đóng sự cố yêu cầu xử lý hết phiếu liên quan; lô vẫn bị chặn xuất sau khi đóng. Không sửa báo cáo để che sai lệch tồn.

## Workflow mở rộng

`scope: own` giới hạn hồ sơ theo người tạo, nhưng owner/manager được xem toàn bộ nếu model cấp quyền read. `differentActor` so với người tạo; `when` kiểm điều kiện dữ liệu không dùng eval. Hạn xử lý tạo cờ overdue, không tự chuyển trạng thái. [Định nghĩa đầy đủ](../docs/PLATFORM.md).

## Migration và kiểm thử

`selfhost/migrate-platform.mjs` tách dữ liệu JSON cũ trong transaction. Không đổi trực tiếp schema production bằng sửa JSON hoặc SQL tùy ý. Thay migration cần kiểm giữ dữ liệu, chạy lại và rollback xung đột. Xem tests domain, platform, platform-storage, platform-api và workspace-queue trong [bản đồ mã](../docs/CODEBASE.md).

## Chọn bài kiểm theo thay đổi

| Thay đổi | Lệnh chạy từ thư mục gốc | Kết quả cần đối chiếu |
| --- | --- | --- |
| Giao và thu hồi lô | `node --test tests/domain.test.mjs tests/impact.test.mjs` | Số đã giao, số trả và lượng còn phải thu khớp từng điểm nhận |
| Cài, nâng cấp hoặc gỡ ứng dụng | `node --test tests/package-lifecycle.test.mjs` | Kiểm phiên bản, dữ liệu giữ lại và quyền truy cập theo kho |
| Ghi lại một quyết định | `node --test tests/business-evidence.test.mjs` | Gói xuất kiểm được bằng khóa công khai và phát hiện dữ liệu đã bị sửa |
