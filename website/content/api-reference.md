# Tham chiếu API

Danh mục endpoint dựa trên router hiện tại. Các route dưới đây có tiền tố /api. **Session** là phiên cùng nguồn; **Device** là Bearer token của thiết bị. Quyền chi tiết vẫn được kiểm tra ở Core và model. Tài liệu cung cấp hợp đồng HTTP, tham số và ví dụ tích hợp. Website tài liệu không thực thi yêu cầu API.

## Core và kho

| Phương thức và đường dẫn | Quyền | Tham số và kết quả |
| --- | --- | --- |
| GET /health | Kiểm tra dịch vụ | status, version, database; không chứng minh SSO |
| GET /state | Phiên đăng nhập | Snapshot kho, members, me, alerts |
| GET /export | Phiên đăng nhập | Snapshot JSON tải xuống; không phải backup đầy đủ |
| GET /platform | Phiên đăng nhập | Discovery, role, installedApplications |
| GET /impact/{lotId} | Phiên đăng nhập | Đối soát thu hồi và revision |
| GET /barcode/{code} | Phiên đăng nhập | 8–14 chữ số; Open Food Facts, cache |
| POST /partners | Quyền ghi | name, kind supplier/destination, contact?, address? |
| POST /lots | Quyền ghi | code, product, supplier, quantity, unit, expiry, location, min_temp, max_temp, barcode?, notes? |
| POST /shipments | Quyền ghi | lot, destination, quantity |
| POST /shipments/{id}/deliver | Quyền ghi | {} |
| POST /shipments/{id}/cancel | Quyền ghi | {} |
| POST /shipments/{id}/return | Quyền ghi | quantity?; mặc định số còn phải trả |
| POST /incidents | Quyền ghi | lot, reason, severity medium/high/critical |
| POST /incidents/{id}/approve | Quản lý | {} |
| POST /incidents/{id}/close | Quản lý | {} |
| POST /quality/{id}/escalate | Quản lý | version, lot, reason, severity |
| POST /workspace | Chủ kho | name |
| POST /workflow | Quyền ghi | title, content |
| POST /workflow/{id}/transition | Theo workflow | target |

Writer = owner/manager/warehouse; Manager = owner/manager. Các POST nghiệp vụ trên cần Idempotency-Key.

## Tài khoản, thiết bị, tài liệu

| Phương thức và đường dẫn | Quyền | Body / query |
| --- | --- | --- |
| POST /members | Chủ kho | email, role; không cần khóa lệnh |
| POST /members/{id}/role | Chủ kho | role viewer/warehouse/manager/disabled |
| POST /devices | Quản lý | name, lot; trả token một lần |
| POST /devices/{id}/revoke | Quản lý | {} |
| POST /ingest | Device | id, temperature, recorded |
| GET /sensor-history/{deviceId} | Phiên đăng nhập | offset; tối đa 100, nextOffset |
| POST /documents | Quyền ghi | title, content |
| POST /assistant | Phiên đăng nhập | question; mode, answer, sources |
| POST /files | Quyền ghi | multipart file, entity; PNG/JPEG/PDF, tối đa 5 MiB |
| GET /files/{id} | Phiên đăng nhập | Binary nếu scan=clean, nếu không 423 |

Devices và documents cần khóa lệnh. Upload tự sinh khóa phía Core; ingest dùng ID phép đo. Assistant không thực hiện thao tác ghi nghiệp vụ.

## AppKit và Data Catalog

| Phương thức và đường dẫn | Quyền | Body / kết quả |
| --- | --- | --- |
| GET /apps | Phiên đăng nhập | applications được đọc |
| GET /apps/{id}/manifest | Theo model | Manifest v1 |
| POST /apps/plan | Chủ kho | manifest → baseVersion, rejections |
| POST /apps/install | Chủ kho | manifest, baseVersion |
| POST /apps/bundle-plan | Chủ kho | bundle → baseVersions, models, applicable |
| POST /apps/bundle-install | Chủ kho | bundle, baseVersions |
| GET /catalog | Phiên đăng nhập | Model metadata theo quyền |
| GET /catalog/{id}/profile | Theo model | total, latest, fields present/missing |

Install cần khóa lệnh. Plan không ghi. Profile tính trên phạm vi được phép đọc, không xuất giá trị thô.

## Models và BPMN

| Phương thức và đường dẫn | Quyền | Body / query |
| --- | --- | --- |
| GET /models | Phiên đăng nhập | model?, limit, offset, q, status, open?, order? |
| GET /models/{id}/records | Theo model | models, records, summary, page |
| GET /models/{id}/openapi | Theo model | OpenAPI sinh từ model |
| GET /models/{id}/bpmn | Theo model | XML workflow FSM |
| GET /models/{id}/process-bpmn | Theo model | XML orchestration nếu có |
| POST /models/plan | Chủ kho | definition |
| POST /models/apply | Chủ kho | definition, baseVersion |
| POST /models/bpmn/plan | Chủ kho | xml, definition? |
| POST /models/bpmn/apply | Chủ kho | xml, definition?, baseVersion |
| POST /models/{id}/records | Theo model | data |
| POST /models/{id}/update | Người tạo ở initial | id, version, data |
| POST /models/{id}/transition | Theo transition | id, version, target, reason? |
| POST /models/{id}/process-complete | Theo task | id, version, task, reason? |
| POST /models/{id}/process-tick | Quản lý | id, version |

Apply và lệnh record cần khóa lệnh. OpenAPI hiện sinh theo từng model, không phải đặc tả toàn bộ Core.

## Audit và metrics

| Phương thức và đường dẫn | Quyền | Kết quả |
| --- | --- | --- |
| GET /audit-ledger | Quản lý | after?, events, cursor |
| GET /audit-ledger/verify | Quản lý | valid, entries, head hoặc failedAt |
| GET /audit-ledger/export | Quản lý | Gói audit JSON, tối đa 10 MiB |
| GET /metrics | Quản lý | Prometheus gauges của workspace |

[Ví dụ gọi API](api-examples.md) · [Xác thực và lỗi](api-auth.md) · [Router nguồn](../../app/api/%5B...path%5D/route.ts).

## Flowable OSS và truy vết cảm biến (main, chưa phát hành)

| Phương thức và đường dẫn | Quyền | Body / kết quả |
| --- | --- | --- |
| POST /flowable-review/start | Owner/manager/warehouse | reference; Idempotency-Key bắt buộc; trả id và tasks |
| GET /flowable-review/{id} | Owner/manager/warehouse cùng workspace | Trạng thái, outcome và tasks theo vai trò |
| POST /flowable-review/{id}/complete | Vai trò nhiệm vụ; không phải người tạo | taskId, approved (boolean), reason |
| GET /sensor-lineage/{device}?reading={sampleId} | Owner/manager | Số đo, lô, fingerprint, audit nếu tồn tại |

Flowable yêu cầu overlay; 503 khi chưa cấu hình, 403 khi không đủ quyền, 404 ngoài workspace, 409 khi xung đột hoặc kết quả chưa chắc chắn. Đọc trạng thái trước khi thử lại thao tác complete. Quy trình thẩm định không tự giải phóng lô.

[Hướng dẫn Flowable](../../docs/NATIVE-REVIEW.md).

## Chọn điểm vào khi tích hợp

Ứng dụng dùng phiên trình duyệt gọi API trên tên miền ứng dụng. Thiết bị gắn với lô gửi mẫu đến ingest bằng khóa riêng. Khi tích hợp mô hình khai báo, đọc OpenAPI của chính model đã cài để lấy cấu trúc trường hiện tại. [Ví dụ đọc, tạo và chuyển bước hồ sơ](api-examples.md) · [Xác thực và xử lý lỗi](api-auth.md).
