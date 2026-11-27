# External API v2 và SDK

Đăng ký client trong Keycloak với audience của external-api, email đã xác minh, scope đọc hồ sơ và các scope ghi cần dùng. Khai báo client trong policy phiên bản 2. Người dùng phải là thành viên hiện hữu của workspace.

```json
{"version":2,"clients":[{"clientId":"maintenance-reader","workspace":"ws-EXAMPLE","area":"live","models":["pkg_maintenance_maintenance"],"requestsPerMinute":30,"scopes":["dxtrace.records.read","dxtrace.tasks.read"]}]}
```

Cả URL v1 và v2 dùng workspace, model và vùng do operator cấp cho client. Vùng mặc định là live. Với vùng thực hành, đặt `area` thành `training` trong policy. Dùng khóa Idempotency-Key ổn định cho mỗi lần tạo hồ sơ hoặc chuyển trạng thái. Truy vấn task cần scope `dxtrace.tasks.read`. Metadata bằng chứng cần scope `dxtrace.evidence.read`, vai trò owner/manager và quyền đọc đúng hồ sơ.

| Method | Route |
|---|---|
| GET | /v2/apps |
| GET | /v2/models/{model}/schema |
| GET/POST | /v2/models/{model}/records |
| GET | /v2/models/{model}/records/{id} |
| POST | /v2/models/{model}/records/{id}/transition |
| GET | /v2/models/{model}/records/{id}/tasks |
| GET | /v2/models/{model}/records/{id}/evidence |


Dùng endpoint schema để lấy OpenAPI của model. Tải gói SDK từ release hoặc thư mục sdk của bản cài. [Ví dụ gọi SDK](../sdk/README.md). Gói bằng chứng đầy đủ có lịch sử ledger của workspace và được xuất trong portal quản lý.
