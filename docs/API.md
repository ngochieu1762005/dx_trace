# Danh mục API DX-TRACE

Đường dẫn có tiền tố `/api`. Tài khoản sử dụng phiên OIDC của ứng dụng; khi truy cập dữ liệu mẫu cục bộ hoặc dữ liệu mẫu cũ, thêm `?area=training` cho yêu cầu nghiệp vụ. Đầu dò dùng Bearer token riêng. Với lệnh cập nhật đi qua bộ xử lý nghiệp vụ, dùng cùng `Idempotency-Key` khi gửi lại cùng nội dung.

| Phương thức | Đường dẫn | Công việc |
| --- | --- | --- |
| GET | `/api/health` | Đọc trạng thái dịch vụ, phiên bản và trạng thái cấu hình cơ sở dữ liệu. |
| GET | `/api/state`, `/api/export` | Đọc hoặc xuất snapshot của kho đang chọn. |
| GET | `/api/platform` | Danh mục ứng dụng, quy trình và thông tin quyền hiện tại. |
| GET | `/api/impact/{lotId}` | Số đã giao, đã trả, chưa giao và còn phải thu theo điểm nhận. |
| GET | `/api/barcode/{code}` | Tra mã 8–14 chữ số qua cache và Open Food Facts. |
| POST | `/api/partners`, `/api/lots` | Tạo đối tác hoặc nhập lô. |
| POST | `/api/shipments`, `/api/shipments/{id}/{action}` | Lập phiếu; xử lý bằng `deliver`, `cancel` hoặc `return`. |
| POST | `/api/incidents`, `/api/incidents/{id}/{action}` | Ghi sự cố; duyệt bằng `approve` hoặc đối soát và đóng bằng `close`. |
| POST | `/api/devices`, `/api/devices/{id}/revoke` | Cấp hoặc thu hồi khóa đầu dò. |
| POST | `/api/ingest` | Tiếp nhận mã phép đo, nhiệt độ và giờ UTC bằng khóa thiết bị. |
| GET | `/api/sensor-history/{id}?offset=0` | Trả tối đa 100 số đo và vị trí trang tiếp theo. |
| POST | `/api/documents`, `/api/assistant` | Thêm SOP hoặc đặt câu hỏi tra cứu. |
| POST / GET | `POST /api/files`, `GET /api/files/{id}` | Tải tệp lên, kiểm tra trạng thái kiểm dịch trước khi cho tải xuống. |
| POST | `/api/workflow`, `/api/workflow/{id}/transition` | Tạo đề xuất và chuyển bước xét duyệt. |
| POST | `/api/workspace`, `/api/members`, `/api/members/{id}/role` | Đổi tên kho, cấp quyền theo email, cập nhật vai trò thành viên. |

[Kiến trúc và đích API bên ngoài](../README.md#architecture) · [Mã xử lý HTTP](../app/api/%5B...path%5D/route.ts)

## Headless API và hai ứng dụng

Trong Docker, `selfhost/core-server.mjs` xử lý các API ở một tiến trình riêng và xác thực yêu cầu chuyển tiếp bằng `DX_CORE_TOKEN` nội bộ. Không công bố cổng của core. Giao diện kho `/`, bao gồm mục `#requests`, dùng cùng API và phiên OIDC. **Không** gửi `DX_CORE_TOKEN` từ trình duyệt; API công khai đi qua Caddy, OAuth2 Proxy và web reverse proxy. [Chi tiết](HEADLESS-CORE.md).


## Nghiệp vụ mở rộng

API mô hình, plan/apply, hồ sơ có phân quyền, lọc và phân trang được mô tả tại [PLATFORM.md](PLATFORM.md#api). Hồ sơ mở rộng lưu riêng trong SQLite; GET danh sách mặc định trả tối đa 50 dòng, không trả toàn bộ kho.
