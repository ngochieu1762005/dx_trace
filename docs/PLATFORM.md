# Nghiệp vụ mở rộng và vận hành

Tài liệu áp dụng cho **v0.0.5**. Không đặt lại kho hay tạo tài khoản mới khi nâng cấp. Đọc [quy trình backup/migration](../selfhost/OPERATIONS.md) trước khi thay phiên bản.

## Tạo một nghiệp vụ

1. Đăng nhập bằng chủ không gian và chọn **Nghiệp vụ mở rộng**.
2. Chọn mẫu Bảo trì, Mua sắm, Kiểm tra chất lượng hoặc Yêu cầu khách hàng trong Thư viện mẫu. Tệp tương ứng nằm trong `examples/*/model.json`.
3. Chọn xem kế hoạch, đọc các thay đổi và lỗi tương thích, sau đó áp dụng.
4. Chọn mô hình, nhập dữ liệu vào biểu mẫu rồi tạo hồ sơ.
5. Gửi duyệt; đăng nhập bằng người quản lý khác để phê duyệt. Mô hình mẫu cấm người tạo tự duyệt.
6. Nhập lý do khi từ chối hoặc hoàn tất. Dùng bộ lọc quá hạn, tìm kiếm và phân trang để theo dõi. CSV xuất đúng trang đang xem (tối đa 50 hồ sơ trên giao diện).

Kho thực hành và Kho vận hành giữ mô hình, hồ sơ và nhật ký trong vùng dữ liệu riêng. Hãy thử cấu hình ở Kho thực hành trước. Quyền tài khoản vẫn thuộc tổ chức chung.

## Cấu hình và an toàn thay đổi

Mỗi mô hình có `id`, `name`, `fields`, `permissions` và `workflow`. Hỗ trợ trường text, number, boolean, date, choice; thuộc tính `required` và danh sách `options` cho choice.

`permissions.read/create` nhận các vai trò owner, manager, warehouse, viewer. `scope: own` giới hạn người dùng thường vào hồ sơ của mình; owner/manager xem toàn bộ nếu có quyền read. Kiểm tra quyền nằm ở máy chủ.

Workflow khai báo states, initial, terminal và transitions. Mỗi bước có from, to, roles, có thể thêm reasonRequired, differentActor, dueHours và điều kiện `when: {field, op, value}`. Các phép so sánh là eq/ne/gt/gte/lt/lte; so sánh thứ tự chỉ dùng cho trường số. Không thực thi biểu thức JavaScript. Trường số có thể đặt min/max. `differentActor` so với người tạo hồ sơ. Hạn xử lý tạo cờ quá hạn, **không tự chuyển bước hoặc gửi cảnh báo**.

Plan trả baseVersion, nextVersion, số hồ sơ và các thay đổi bị từ chối. Khi có hồ sơ, không được xóa trường/đổi kiểu; mọi hồ sơ phải còn hợp lệ. Không đổi workflow khi còn hồ sơ chưa kết thúc. Apply kiểm tra lại kế hoạch và baseVersion để tránh ghi đè thay đổi của người khác. Lịch sử tối đa 50 phiên bản. Chọn cấu hình cũ rồi plan/apply tạo phiên bản mới nếu tương thích; đây không phải rollback cơ sở dữ liệu.

Mẫu mua sắm cho phép quản lý duyệt trực tiếp số tiền đến 5 triệu; trên mức đó phải chuyển sang trạng thái escalated, sau đó chủ không gian khác người tạo mới được duyệt. Đây là chuyển cấp do người dùng thực hiện, không phải tác vụ tự chạy khi quá hạn. Mẫu chất lượng chỉ lưu mã lô tham chiếu dạng văn bản, chưa tạo liên kết khóa ngoại với lô kho.

## API

Các endpoint dùng phiên đăng nhập hiện có qua OAuth2 Proxy. POST ghi cần `Content-Type: application/json`, nguồn cùng ứng dụng và `Idempotency-Key` duy nhất cho mỗi thao tác (plan chỉ đọc, không yêu cầu khóa); khi thử lại cùng thao tác giữ nguyên khóa. Không truyền danh tính giả từ trình duyệt.

| Phương thức và đường dẫn | Nội dung |
| --- | --- |
| GET `/api/models` | Mô hình, hồ sơ và thống kê theo quyền |
| POST `/api/models/plan` | `{definition}`; chỉ owner |
| POST `/api/models/apply` | `{definition,baseVersion}`; chỉ owner |
| GET `/api/models/:id/records` | Hồ sơ có quyền đọc |
| POST `/api/models/:id/records` | `{data}` |
| POST `/api/models/:id/update` | `{id,version,data}`; người tạo sửa ở trạng thái đầu |
| POST `/api/models/:id/transition` | `{id,version,target,reason}` |
| GET `/api/models/:id/openapi` | OpenAPI của mô hình |
| GET `/api/audit-ledger?after=0` | Trang tối đa 100 mục; manager/owner |
| GET `/api/audit-ledger/verify` | Kiểm tra liên kết và hash; manager/owner |
| GET `/api/metrics` | Số liệu dạng Prometheus; manager/owner |

Danh sách hỗ trợ `model`, `status`, `q`, `limit` (1–200, mặc định 50) và `offset`. Ví dụ `/api/models/maintenance/records?status=submitted&limit=50&offset=0`. Quyền được đưa vào điều kiện SQL trước khi đếm và phân trang. `summary` là tổng của mô hình/phạm vi quyền trước lọc tìm kiếm và trạng thái; `page.total` là số kết quả sau lọc. Tìm kiếm nội dung dùng LIKE có escape, không phải full-text search. Offset có thể dịch chuyển khi người khác ghi dữ liệu; làm mới khi cần đối soát.

Mã 403 là thiếu quyền, 409 là xung đột phiên bản/trạng thái, 422 là dữ liệu không hợp lệ. Không tự thử lại lỗi 409 bằng cách thay version: tải lại hồ sơ và kiểm tra trước.

`examples/maintenance/client.mjs` dành cho quản trị viên kiểm tra Core qua SSH tunnel loopback. Cần DX_CORE_TOKEN, DX_USER, DX_EMAIL; không phải SDK OAuth công khai. Không mở cổng Core ra Internet hoặc đưa token vào frontend.

## Nhật ký và webhook

Mỗi lệnh thay đổi nghiệp vụ thành công thêm một mục audit_ledger cùng giao dịch cập nhật dữ liệu. Mỗi mục nối SHA-256 với mục trước, bao gồm action, actor, entity và thời gian. API verify phát hiện chuỗi bị sửa mà không cập nhật hash tương ứng. Chuỗi không có neo bên ngoài: người có quyền ghi toàn bộ DB vẫn có thể viết lại hoặc cắt chuỗi. Đây không phải chữ ký số, và không bao phủ mọi thay đổi tài khoản/cấu hình bên ngoài luồng lệnh.

Webhook mặc định tắt. Đặt trong `selfhost/.env` rồi tái tạo core:

```dotenv
WEBHOOK_URL=https://receiver.example.org/events
WEBHOOK_WORKSPACE=workspace-id
WEBHOOK_SECRET=replace-with-at-least-32-random-characters
```

Chỉ chọn một workspace cho worker. ID phải lấy từ dữ liệu triển khai thực tế. Bật mới sẽ gửi cả lịch sử chưa được đánh dấu giao; hãy chuẩn bị phía nhận trước.

Payload gồm id, seq, hash, previous và event. Chữ ký ở `X-DX-Signature` là `sha256=` cộng HMAC-SHA256 của `timestamp + '.' + rawBody`, dùng WEBHOOK_SECRET. `X-DX-Timestamp` là thời gian ký; `X-DX-Event-Id` là ID ổn định. Bên nhận phải kiểm tra chữ ký trên byte gốc, giới hạn độ lệch thời gian và lưu ID để chống xử lý trùng. Trả 2xx khi đã tiếp nhận bền vững.

Worker gửi mỗi 5 giây, tối đa 20 sự kiện/lượt, timeout 8 giây, không theo redirect. Thử lại với backoff tối đa một giờ, dừng sau 12 lần. Bảng `webhook_delivery` giữ attempts, next_attempt, delivered và last_status để vận hành kiểm tra. Chưa có màn hình phát lại dead letter. Giao nhận ít nhất một lần; không bảo đảm thứ tự. Chạy một worker cho cùng DB; bên nhận vẫn phải chống trùng.

## Kiểm tra và nâng cấp

Tại thư mục gốc repo:

```bash
node selfhost/doctor.mjs
node selfhost/build.mjs
node --test tests/*.test.mjs
python3 -m unittest discover -s tests -p '*_test.py'
```

Doctor chỉ đọc cấu hình, kiểm tra Node/Docker Compose và báo RAM/đĩa; không in giá trị bí mật. Đây không phải đo tải hay kiểm tra SSO hoàn chỉnh.

Trước nâng cấp, thực hiện quy trình sao lưu hiện có và lưu riêng `.env`, cấu hình Caddy, DB Keycloak. Kiểm tra bản sao lưu nghiệp vụ:

```bash
node selfhost/verify-backup.mjs /absolute/path/to/backup
```

Lệnh mở SQLite chỉ đọc, chạy integrity_check và đối chiếu SHA-256 từng tệp đính kèm. Không thay thế diễn tập khôi phục đầy đủ, không kiểm tra bản sao lưu PostgreSQL/Keycloak. Kiểm thử tự động dựng lại server từ bản sao lưu trên dữ liệu thử.

Migration `0002_audit_ledger.sql` tạo sổ nhật ký. `0003_platform_records.sql` tạo bảng mô hình, hồ sơ và mã yêu cầu. Khi khởi động, `migrate-platform.mjs` chuyển mô hình/hồ sơ cũ khỏi JSON workspace trong một transaction; giữ ID, phiên bản, lịch sử và vùng kho. Chạy lại không nhân đôi dữ liệu. Xung đột sẽ rollback toàn bộ việc chuyển, dừng khởi động để tránh mất dữ liệu.

**Trước nâng cấp phải sao lưu.** Sau chuyển đổi không chạy lại image cũ trên DB đã nâng cấp: phiên bản cũ không đọc bảng hồ sơ mới. Muốn quay lui phải dừng ghi, khôi phục cả DB/tệp từ bản sao lưu trước nâng cấp và chạy image tương ứng; các thay đổi sau thời điểm sao lưu cần đối soát riêng. Migration không đổi các lô, phiếu giao và số đo hiện có. Sau triển khai, kiểm tra đăng nhập thật, cả hai kho, tạo hồ sơ và duyệt bằng hai tài khoản. Không dùng `docker compose down -v` khi cập nhật.

## Giới hạn và hướng tiếp theo

- Đây là engine trạng thái hữu hạn hỗ trợ nhập/xuất [tập con BPMN 2.0](BPMN.md); **không** phải BPMN/Flowable executor tổng quát, chưa có nhánh song song, tác vụ nền theo lịch hay thiết kế kéo thả. Ứng dụng mới có thể đóng gói bằng [AppKit khai báo](APPKIT.md).
- Hồ sơ mở rộng lưu từng dòng trong SQLite với chỉ mục workspace/model/actor/status; không còn chung giới hạn 1,8 MB của JSON kho. Mỗi payload hồ sơ/mô hình tối đa 512 KiB. Dữ liệu kho truyền thống vẫn còn giới hạn JSON hiện có. Chưa sinh bảng SQL riêng theo mỗi mô hình, chưa hỗ trợ PostgreSQL nghiệp vụ hoặc nhiều bản Core chạy HA.
- Chưa có cụm HA, object storage phân tán, dịch vụ quét virus tích hợp hoặc dashboard giám sát ngoài. FILE_SCAN_URL/TOKEN chỉ nối với dịch vụ quét do đơn vị triển khai cung cấp.
- OpenAPI bao phủ hợp đồng cơ bản; chưa có OAuth service account SDK, trình sinh client hoặc kiểm thử trình duyệt tự động cho toàn bộ sản phẩm.
- Kiểm thử API không chứng minh camera trên mọi điện thoại, SSO trên VPS hay hiệu năng tải thực tế.

Xem [ma trận minh chứng](EVIDENCE.md) và [phép đo HTTP cục bộ](BENCHMARK.md). Ưu tiên tiếp theo là SSO end-to-end tự động, thử nghiệm tại một kho và đo toàn stack trên cấu hình VPS cố định trước khi tăng quy mô.
