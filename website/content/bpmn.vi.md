<!-- SPDX-FileCopyrightText: 2026 DX-TRACE contributors
SPDX-License-Identifier: MIT
DX-TRACE project authors: Đặng Nhật Minh, Nguyễn Ngọc Hiếu
-->
# Trao đổi quy trình bằng BPMN 2.0

DX-TRACE xuất quy trình của một mô hình thành XML để đọc bằng công cụ BPMN. Khi nhập lại, Core chuyển phần XML được hỗ trợ thành định nghĩa quy trình có phiên bản.

| Phần tử | Ý nghĩa trong mô hình |
| --- | --- |
| `startEvent`, `endEvent` | Trạng thái đầu và cuối |
| `userTask` | Trạng thái có tên trong quy trình |
| `exclusiveGateway` | Chọn một nhánh xử lý |
| `sequenceFlow` | Chuyển từ trạng thái nguồn đến trạng thái đích |
| `dx:roles`, `dx:guard`, `dx:differentActor` | Kiểm vai trò, điều kiện dữ liệu và yêu cầu người duyệt khác người tạo |

## Kiểm tra khi nhập

Xuất mô hình, sửa tệp XML và xem kế hoạch trước khi áp dụng. Công cụ BPMN khác có thể bỏ thuộc tính mở rộng của DX-TRACE. Đối chiếu quyền, lý do bắt buộc và điều kiện chuyển bước trong kế hoạch. Với phần tử ngoài tập hỗ trợ, máy chủ từ chối bản nhập.

```sh
node --test tests/bpmn.test.mjs tests/platform-api.test.mjs
```

Xem [bộ thực thi quy trình](../../docs/PROCESS-RUNTIME.md) để chạy ví dụ có nhánh song song và bộ đếm giờ.
