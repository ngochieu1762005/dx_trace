# API: xác thực, lỗi và retry

API nghiệp vụ có tiền tố /api trên domain ứng dụng, không phải domain tài liệu. Phiên trình duyệt dùng Keycloak/OAuth2 Proxy; external API tùy chọn có chính sách riêng. Không gửi token Core, header X-Forwarded giả hoặc mật khẩu từ browser.

## Quy ước

- GET để đọc; POST JSON cho lệnh nghiệp vụ. Upload là multipart.
- Với kho thực hành thêm area=training cho cả đọc và ghi.
- Idempotency-Key tối đa 100 ký tự cho các lệnh yêu cầu khóa. Retry giữ đúng khóa và nội dung; thao tác mới dùng khóa mới.
- Lệnh cập nhật hồ sơ dùng version; model apply dùng baseVersion.
- Các API plan chỉ đọc. Members, upload và ingest có cơ chế riêng.

## Mã phản hồi

| HTTP | Xử lý |
| --- | --- |
| 200 | Đọc hoặc lệnh thành công; kiểm body theo endpoint |
| 400 | Thiếu hoặc sai mã yêu cầu |
| 401 | Phiên/token thiếu hoặc không hợp lệ |
| 403 | Không có quyền hoặc origin không hợp lệ |
| 404 | Không tìm thấy tài nguyên |
| 409 | Xung đột phiên bản/trạng thái/khóa lệnh; tải lại trước khi quyết định |
| 413 | Yêu cầu/dữ liệu vượt giới hạn |
| 422 | Dữ liệu hoặc model không hợp lệ |
| 423 | Tệp đang cách ly |
| 429 | Gateway giới hạn tần suất |
| 502/503 | Upstream lỗi hoặc kho bận; retry có giãn cách, giữ khóa lệnh |
| 500 | Lỗi nội bộ; lưu thời điểm và mã thao tác, không gửi dữ liệu bí mật |

Lỗi Core thường có JSON {"error":"..."}. Proxy có thể trả HTML hoặc body khác, nên kiểm content-type trước khi parse. Không retry vô hạn; không tự cấp lại quyền khi nhận 403.

[API Reference](api-reference.md) · [External API](../../docs/EXTERNAL-API.md).
