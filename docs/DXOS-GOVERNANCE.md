# Bốn nguyên lý DX-OS

Đối chiếu theo [đề thi PMNM OLP 2026 do VFOSSA công bố, mục 4](https://vfossa.vn/tin-tuc/de-thi-phan-mem-nguon-mo-olp-2026-798.html). Các mục dưới mô tả phần đã triển khai và giới hạn; không phải chứng nhận đáp ứng toàn bộ đề thi.

## Dữ liệu nóng/lạnh

Core giữ các số đo gần nhất và lịch sử có chỉ mục. Xuất tháng đã kết thúc từ bản sao SQLite nhất quán, theo workspace, sang JSONL gzip kèm manifest SHA-256:

```sh
node tools/archive-sensors.mjs export /secure/backup/warehouse.sqlite /secure/cold/oct ws-example 2026-10
node tools/archive-sensors.mjs verify /secure/cold/oct
node tools/archive-sensors.mjs query /secure/cold/oct device-id
```

Không xóa dữ liệu nguồn, chưa tự động phân tầng, chưa cam kết WORM. Lưu bản xuất tại kho riêng có quyền truy cập và mã hóa phù hợp.

## IT/OT

Thiết bị gửi POST /api/ingest bằng Bearer riêng, chống trùng, kiểm nhiệt độ và thời gian. Ba số đo vượt ngưỡng có thể tạo sự cố cách ly. Công cụ sensor-client.mjs chỉ dùng fixture ở kho thực hành; không chứng nhận phần cứng. Thu hồi khóa sau thử.

## Data Governance và Lineage

GET /api/sensor-lineage/{device}?reading={sampleId} dành cho owner/manager, trả nguồn, lô, thời gian, fingerprint và audit nếu có. Không suy diễn quan hệ nhân quả sự cố. Catalog AppKit vẫn là lineage khai báo.

## Zero Trust và GitOps

APISIX mặc định, khóa gateway/Core riêng; RBAC và cách ly workspace tại Core. Flowable có mạng coreworkflow/workflowdb riêng. Kiểm cấu hình mong muốn qua tools/verify-stack.mjs và CI; chưa có bộ đồng bộ GitOps liên tục. Không công bố cổng nội bộ.

[CI tích hợp](https://github.com/ngochieu1762005/dx_trace/actions/runs/45645226792) · [English](en/dxos-governance.md).
