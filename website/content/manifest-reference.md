# Đặc tả manifest và model

## Manifest v1

| Khóa | Kiểu | Ràng buộc |
| --- | --- | --- |
| apiVersion | string | dxtrace.io/v1 |
| kind | string | DeclarativeApplication |
| metadata.id | string | Chữ thường đầu tiên, chữ thường/số/gạch dưới, tối đa 40 |
| metadata.name | string | Trùng tên model, tối đa 200 |
| metadata.version | string | Phiên bản semver |
| metadata.description | string | Tùy chọn, tối đa 500 |
| metadata.uiPath | string | Tùy chọn, /apps/{id}/; frontend phải được triển khai riêng |
| spec.model | object | Định nghĩa model hợp lệ |

Không khai báo URL mã từ xa hay script thực thi.

## Fields

Từ 1 đến 30 trường; key duy nhất. type gồm text, number, boolean, date, choice. required tùy chọn; choice có options duy nhất, 1–30 giá trị. number có min/max hữu hạn. text có minLength/maxLength trong khoảng 1–4000. Date dạng YYYY-MM-DD hợp lệ.

Ví dụ bắt buộc cost khi priority là Khẩn cấp:

```json
{"key":"cost","label":"Chi phí","type":"number","min":0,
 "requiredWhen":{"field":"priority","equals":"Khẩn cấp"}}
```

## Permissions và workflow

read/create là danh sách vai trò có sẵn; create phải là tập con read. scope all/own; scopeByRole tùy chọn. workflow có 1–20 states, initial thuộc states, terminal là trạng thái kết thúc, tối đa 50 transitions. Mỗi transition gồm from/to/roles, có thể thêm when, differentActor, reasonRequired, dueHours (1–8760). Không chuyển từ terminal.

## Bundle v2

apiVersion dxtrace.io/v2, kind ApplicationBundle; metadata gồm id/name/version; spec.applications chứa 1–12 manifest v1 có ID khác nhau. API trả baseVersions theo model. Cài nguyên tử, không tự tạo quan hệ khóa ngoại hay role Keycloak mới.

## Nguồn chuẩn

[Validator](../../lib/platform.mjs) · [AppKit](../../lib/appkit.mjs) · [Bundle](../../lib/application-bundle.mjs) · [Mẫu bảo trì](../../examples/maintenance/app.json).

## Đọc kế hoạch trước khi đổi biểu mẫu

Thử thêm trường ghi chú tùy chọn vào bản sao manifest bảo trì. Đọc kế hoạch trên kho có hồ sơ cũ, ghi lại phiên bản cơ sở rồi áp dụng. Mở lại một hồ sơ được tạo trước thay đổi và tạo thêm hồ sơ có ghi chú. Nếu phiên bản cơ sở đã đổi, lập kế hoạch mới từ định nghĩa hiện tại. Kiểm cả hồ sơ cũ lẫn mới trước khi bàn giao biểu mẫu.
