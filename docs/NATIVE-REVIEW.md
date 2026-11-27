<!-- SPDX-FileCopyrightText: 2026 DX-TRACE contributors
SPDX-License-Identifier: MIT
DX-TRACE project authors: Đặng Nhật Minh, Nguyễn Ngọc Hiếu
-->
# Quy trình thẩm định Flowable OSS

APISIX mặc định trên main; Flowable OSS là overlay tùy chọn. CI tích hợp PR #35 đã đạt; chưa xác nhận production.

## Flowable OSS và truy vết cảm biến (v0.2.0)

| Method / path | Quyền | Body / kết quả |
| --- | --- | --- |
| POST /flowable-review/start | Owner/manager/warehouse | reference; Idempotency-Key bắt buộc; trả id và tasks |
| GET /flowable-review/{id} | Owner/manager/warehouse cùng workspace | Trạng thái, outcome và tasks theo vai trò |
| POST /flowable-review/{id}/complete | Vai trò nhiệm vụ; không phải người tạo | taskId, approved (boolean), reason |
| GET /sensor-lineage/{device}?reading={sampleId} | Owner/manager | Số đo, lô, fingerprint, audit nếu tồn tại |

Flowable yêu cầu overlay; 503 khi chưa cấu hình, 403 khi không đủ quyền, 404 ngoài workspace, 409 khi xung đột hoặc kết quả chưa chắc chắn. Đọc trạng thái trước khi thử lại thao tác complete. Quy trình thẩm định không tự giải phóng lô.

Hai tác vụ kiểm kê và chất lượng chạy song song; cả hai đạt mới qua timer thử nghiệm hai giây và phê duyệt cuối. Người tạo không được duyệt. Core giữ mapping workspace và ý định khởi tạo bền vững; Flowable giữ trạng thái task. Khi không rõ kết quả tạo, đối soát lịch sử trước khi gửi lại. Sao lưu cả hai DB khi ngừng ghi. Không tự chuyển hồ sơ cũ hoặc thay đổi tồn kho.

## Nghiệm thu

[CI PR #35](https://github.com/ngochieu1762005/dx_trace/actions/runs/45645226792) đã đạt. Chạy smoke trên môi trường riêng, không dùng dữ liệu thật. [Hướng dẫn staging](THIRD-PARTY-CORE-MIGRATION.md) · [English](en/native-review.md).
