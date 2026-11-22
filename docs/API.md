# HTTP API — DX-TRACE v0.0.5

Nguồn đối chiếu: [router](../app/api/%5B...path%5D/route.ts), [domain](../lib/domain.mjs), [platform](../lib/platform.mjs). API công khai dùng tiền tố `/api` trên cùng domain ứng dụng.

## Xác thực và vùng dữ liệu

- Người dùng dùng phiên OAuth2 Proxy/Keycloak. Không gửi `X-Forwarded-*` giả hoặc `DX_CORE_TOKEN` từ browser.
- Kho thực hành: thêm `?area=training` trên cả GET và POST. Kho vận hành: bỏ tham số này. Với query khác, dùng `&area=training`.
- `POST /api/ingest` dùng Bearer token thiết bị; kho được xác định từ khóa.
- Token Core chỉ dùng giữa app và Core trên mạng tin cậy. Hiện chưa có OAuth SDK/service account công khai cho tích hợp bên thứ ba.

POST JSON gửi `Content-Type: application/json`. API từ chối Origin khác nguồn khi có header hoặc `Sec-Fetch-Site: cross-site`. Các lệnh ghi nghiệp vụ yêu cầu `Idempotency-Key` không rỗng, tối đa 100 ký tự: giữ nguyên khóa và nội dung khi gửi lại cùng thao tác; thao tác mới dùng khóa mới.

Ngoại lệ: plan chỉ đọc; assistant không ghi nghiệp vụ; members/role xử lý riêng; upload tự sinh khóa phía server; ingest dùng ID phép đo. Không coi mọi POST đều có cùng cơ chế chống trùng. Bộ nhớ khóa lệnh kho truyền thống giữ 600 mục gần nhất; hồ sơ mở rộng dùng bảng riêng, chưa có chính sách dọn tự động.

## Danh mục endpoint

| Phương thức | Đường dẫn | Mục đích |
| --- | --- | --- |
| GET | `/health` | Phiên bản và DB binding; không phải kiểm tra toàn hệ thống |
| GET | `/state`, `/export` | Snapshot kho theo quyền; không bao gồm mô hình/hồ sơ mở rộng hay toàn bộ lịch sử số đo |
| GET | `/platform` | Discovery, vai trò, workflow đề xuất và danh sách app khai báo đã cài; không phải OpenAPI toàn hệ thống |
| GET | `/impact/{lotId}` | Đối soát thu hồi theo lô/điểm nhận |
| GET | `/barcode/{code}` | Mã 8–14 chữ số; cache 24 giờ và Open Food Facts |
| POST | `/partners`, `/lots` | Tạo đối tác hoặc nhập lô |
| POST | `/shipments` | Tạo phiếu giữ/xuất hàng |
| POST | `/shipments/{id}/deliver`, `/cancel`, `/return` | Hành động trên phiếu; `/cancel` và `/return` cùng tiền tố `/shipments/{id}` |
| POST | `/incidents` | Ghi nhận sự cố |
| POST | `/incidents/{id}/approve`, `/incidents/{id}/close` | Duyệt hoặc đóng sau kiểm tra điều kiện |
| POST | `/devices`, `/devices/{id}/revoke` | Cấp/thu hồi khóa; manager/owner, khóa mới chỉ trả một lần |
| POST | `/ingest` | `{id,temperature,recorded}`; số đo với thời gian UTC |
| GET | `/sensor-history/{deviceId}?offset=0` | Tối đa 100 số đo và `nextOffset` |
| POST | `/documents`, `/assistant` | Thêm SOP; hỏi bằng `{question}` |
| POST / GET | `/files`, `/files/{id}` | Upload multipart hoặc download khi `scan=clean` |
| POST | `/workflow`, `/workflow/{id}/transition` | Đề xuất nội bộ và chuyển trạng thái |
| POST | `/workspace` | Đổi tên kho theo quyền nghiệp vụ |
| POST | `/members`, `/members/{id}/role` | Owner mời email/cập nhật vai trò; không đổi owner bằng endpoint này |
| GET | `/models` | Mô hình, hồ sơ, summary và page theo quyền |
| POST | `/models/plan`, `/models/apply` | Owner kiểm tác động và áp dụng định nghĩa |
| GET / POST | `/models/{modelId}/records` | Tìm hồ sơ hoặc tạo bằng `{data}` |
| POST | `/models/{modelId}/update` | `{id,version,data}`; người tạo sửa ở trạng thái đầu |
| POST | `/models/{modelId}/transition` | `{id,version,target,reason}` |
| GET | `/models/{modelId}/openapi` | Hợp đồng OpenAPI của mô hình có quyền đọc |
| GET | `/models/{modelId}/bpmn` | Tải BPMN 2.0 XML (tập con) theo quyền đọc |
| POST | `/models/bpmn/plan`, `/models/bpmn/apply` | Owner nhập BPMN, dry-run và áp dụng phiên bản |
| GET | `/apps`, `/apps/{id}/manifest` | Liệt kê/xuất AppKit theo quyền đọc |
| POST | `/apps/plan`, `/apps/install` | Owner kiểm kế hoạch và cài app khai báo |
| GET | `/audit-ledger?after=0`, `/audit-ledger/verify` | Manager/owner xem trang 100 sự kiện hoặc kiểm chuỗi hash |
| GET | `/metrics` | Manager/owner; gauges dạng Prometheus, không phải endpoint scrape công khai |

Quyền và điều kiện chi tiết do domain/model kiểm tra ở server; việc ẩn nút trên UI không thay thế kiểm quyền. `{id}` là ID nội bộ, không nhất thiết là mã lô in trên bao bì.

## Phân trang hồ sơ mở rộng

`GET /api/models/maintenance/records?status=submitted&limit=50&offset=0&area=training`

| Tham số | Giá trị |
| --- | --- |
| `model` | Lọc model khi gọi `/models`; model trong path được ưu tiên |
| `status` | `all`, `overdue` hoặc trạng thái của model |
| `q` | Tối đa 200 ký tự, tìm ID/nội dung dữ liệu; không phải full-text search |
| `limit` | 1–200, mặc định 50 |
| `offset` | Số nguyên không âm |

Response có `models`, `records`, `summary`, `page`. `summary` tính trong model/phạm vi quyền trước lọc status/q; `page.total` tính sau lọc. Quyền được đưa vào SQL trước count và pagination. Dữ liệu thay đổi có thể dịch chuyển trang offset. UI xuất CSV **trang hiện tại**, không phải toàn bộ hồ sơ.

## Ví dụ gọi từ phiên trình duyệt đã đăng nhập

Chạy ở DevTools trên đúng domain ứng dụng, sau khi đã áp dụng mẫu bảo trì trong Kho thực hành:

```javascript
const requestId = crypto.randomUUID();
const body = {data: {
  equipment: 'Tủ lạnh kho A',
  description: 'Kiểm tra gioăng cửa',
  priority: 'Thường'
}};
const response = await fetch('/api/models/maintenance/records?area=training', {
  method: 'POST',
  headers: {'Content-Type': 'application/json', 'Idempotency-Key': requestId},
  body: JSON.stringify(body)
});
console.log(response.status, await response.json());
```

Nếu chưa rõ yêu cầu trước đã được ghi hay chưa, dùng lại `requestId` và `body`, không sinh khóa mới. [Định nghĩa mẫu và workflow](PLATFORM.md).

## Tệp và tích hợp ngoài

Upload dùng `FormData` gồm `file` và `entity`. Hỗ trợ PNG/JPEG/PDF đến 5 MiB, kiểm byte đầu định dạng và tính SHA-256. Không cấu hình scanner thì `scan=pending`; download trả 423. Scanner ngoài nhận byte, trả JSON `{clean:true}` khi sạch. Chưa có endpoint quét lại tự động cho tệp cũ đang pending.

Barcode trả `barcode,name,brand,quantity,source,url,license`; kết quả là thông tin tham khảo, không chứng minh xuất xứ lô. Assistant mặc định trả `mode: retrieval`; khi Core có khóa Groq, có thể trả `mode: llm`. Xem [cấu hình vận hành](../selfhost/OPERATIONS.md).

## Xử lý lỗi

| HTTP | Hướng xử lý |
| --- | --- |
| 400 | Kiểm mã yêu cầu và cấu trúc yêu cầu |
| 401 | Đăng nhập lại; thiết bị kiểm khóa |
| 403 | Kiểm vai trò, quyền hồ sơ và nguồn yêu cầu; không đăng nhập lặp |
| 404 | Đối chiếu ID, model và kho đang chọn |
| 409 | Dữ liệu/phiên bản/trạng thái hoặc mã yêu cầu xung đột; tải lại trước khi quyết định |
| 413 / 422 | Giảm kích thước hoặc sửa đầu vào theo lỗi |
| 423 | Tệp đang cách ly |
| 502 | Dịch vụ ngoài/proxy lỗi; kiểm log và kết nối |
| 503 | Kho bận hoặc dịch vụ chưa sẵn sàng; thử lại có giãn cách với cùng khóa |

Lỗi nghiệp vụ trả JSON `{error: "..."}`. Lỗi proxy có thể trả HTML; không coi mọi lỗi máy chủ là hết phiên. Các API hiện có giới hạn khác nhau, chưa có hợp đồng OpenAPI duy nhất cho toàn bộ kho.

## API mở rộng trên nhánh nâng cấp

Các endpoint BPMN và AppKit được bổ sung trên nhánh nâng cấp, **chưa nằm trong release v0.0.5**. [Tập con BPMN và ví dụ](BPMN.md) · [AppKit khai báo](APPKIT.md). Import BPMN từ chối phần tử không hỗ trợ, không dùng XML DTD/XXE. Cả hai cơ chế đều đi qua model plan/apply và audit-ledger; không cho phép thực thi JavaScript hoặc truy cập Core bằng token từ trình duyệt.
