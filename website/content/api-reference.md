# API Reference

Danh mục endpoint dựa trên router hiện tại. Các route dưới đây có tiền tố /api. **Session** là phiên cùng nguồn; **Device** là Bearer token của thiết bị. Quyền chi tiết vẫn được kiểm tra ở Core và model. Đây là reference tĩnh, không phải console gọi production trực tiếp.

## Core và kho

| Method / path | Quyền | Body / query và kết quả |
| --- | --- | --- |
| GET /health | Health route | status, version, database; không chứng minh SSO |
| GET /state | Session | Snapshot kho, members, me, alerts |
| GET /export | Session | Snapshot JSON tải xuống; không phải backup đầy đủ |
| GET /platform | Session | Discovery, role, installedApplications |
| GET /impact/{lotId} | Session | Đối soát thu hồi và revision |
| GET /barcode/{code} | Session | 8–14 chữ số; Open Food Facts, cache |
| POST /partners | Writer | name, kind supplier/destination, contact?, address? |
| POST /lots | Writer | code, product, supplier, quantity, unit, expiry, location, min_temp, max_temp, barcode?, notes? |
| POST /shipments | Writer | lot, destination, quantity |
| POST /shipments/{id}/deliver | Writer | {} |
| POST /shipments/{id}/cancel | Writer | {} |
| POST /shipments/{id}/return | Writer | quantity?; mặc định số còn phải trả |
| POST /incidents | Writer | lot, reason, severity medium/high/critical |
| POST /incidents/{id}/approve | Manager | {} |
| POST /incidents/{id}/close | Manager | {} |
| POST /quality/{id}/escalate | Manager | version, lot, reason, severity |
| POST /workspace | Owner | name |
| POST /workflow | Writer | title, content |
| POST /workflow/{id}/transition | Theo workflow | target |

Writer = owner/manager/warehouse; Manager = owner/manager. Các POST nghiệp vụ trên cần Idempotency-Key.

## Tài khoản, thiết bị, tài liệu

| Method / path | Quyền | Body / query |
| --- | --- | --- |
| POST /members | Owner | email, role; không cần khóa lệnh |
| POST /members/{id}/role | Owner | role viewer/warehouse/manager/disabled |
| POST /devices | Manager | name, lot; trả token một lần |
| POST /devices/{id}/revoke | Manager | {} |
| POST /ingest | Device | id, temperature, recorded |
| GET /sensor-history/{deviceId} | Session | offset; tối đa 100, nextOffset |
| POST /documents | Writer | title, content |
| POST /assistant | Session | question; mode, answer, sources |
| POST /files | Writer | multipart file, entity; PNG/JPEG/PDF, tối đa 5 MiB |
| GET /files/{id} | Session | Binary nếu scan=clean, nếu không 423 |

Devices và documents cần khóa lệnh. Upload tự sinh khóa phía Core; ingest dùng ID phép đo. Assistant không thực hiện thao tác ghi nghiệp vụ.

## AppKit và Data Catalog

| Method / path | Quyền | Body / kết quả |
| --- | --- | --- |
| GET /apps | Session | applications được đọc |
| GET /apps/{id}/manifest | Theo model | Manifest v1 |
| POST /apps/plan | Owner | manifest → baseVersion, rejections |
| POST /apps/install | Owner | manifest, baseVersion |
| POST /apps/bundle-plan | Owner | bundle → baseVersions, models, applicable |
| POST /apps/bundle-install | Owner | bundle, baseVersions |
| GET /catalog | Session | Model metadata theo quyền |
| GET /catalog/{id}/profile | Theo model | total, latest, fields present/missing |

Install cần khóa lệnh. Plan không ghi. Profile tính trên phạm vi được phép đọc, không xuất giá trị thô.

## Models và BPMN

| Method / path | Quyền | Body / query |
| --- | --- | --- |
| GET /models | Session | model?, limit, offset, q, status, open?, order? |
| GET /models/{id}/records | Theo model | models, records, summary, page |
| GET /models/{id}/openapi | Theo model | OpenAPI sinh từ model |
| GET /models/{id}/bpmn | Theo model | XML workflow FSM |
| GET /models/{id}/process-bpmn | Theo model | XML orchestration nếu có |
| POST /models/plan | Owner | definition |
| POST /models/apply | Owner | definition, baseVersion |
| POST /models/bpmn/plan | Owner | xml, definition? |
| POST /models/bpmn/apply | Owner | xml, definition?, baseVersion |
| POST /models/{id}/records | Theo model | data |
| POST /models/{id}/update | Người tạo ở initial | id, version, data |
| POST /models/{id}/transition | Theo transition | id, version, target, reason? |
| POST /models/{id}/process-complete | Theo task | id, version, task, reason? |
| POST /models/{id}/process-tick | Manager | id, version |

Apply và lệnh record cần khóa lệnh. OpenAPI hiện sinh theo từng model, không phải đặc tả toàn bộ Core.

## Audit và metrics

| Method / path | Quyền | Kết quả |
| --- | --- | --- |
| GET /audit-ledger | Manager | after?, events, cursor |
| GET /audit-ledger/verify | Manager | valid, entries, head hoặc failedAt |
| GET /audit-ledger/export | Manager | Gói audit JSON, tối đa 10 MiB |
| GET /metrics | Manager | Prometheus gauges của workspace |

[Ví dụ gọi API](api-examples.md) · [Xác thực và lỗi](api-auth.md) · [Router nguồn](../../app/api/%5B...path%5D/route.ts).
