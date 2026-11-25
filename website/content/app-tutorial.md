# Tutorial: xây dựng ứng dụng nghiệp vụ

Mục tiêu: cài một mô hình bảo trì từ manifest sẵn có, không sửa Core hay viết frontend mới. Thực hiện trong Kho thực hành với owner.

## Bước 1 — đọc mẫu

Mở [manifest bảo trì](../../examples/maintenance/app.json). Metadata chứa id, name và version; spec.model mô tả fields, permissions và workflow.

```bash
node tools/dxtrace.mjs lint examples/maintenance/app.json
node tools/dxtrace.mjs openapi examples/maintenance/app.json
node tools/dxtrace.mjs catalog examples/maintenance/app.json
```

## Bước 2 — xem kế hoạch

Trong Nghiệp vụ mở rộng → AppKit, chọn bảo trì. Bấm xem kế hoạch. Với mô hình mới, baseVersion bằng 0. Khi cập nhật, đọc rejections; không xóa trường đang có dữ liệu hoặc đổi workflow khi hồ sơ chưa kết thúc.

## Bước 3 — cài đặt

Áp dụng kế hoạch nếu hợp lệ. Tạo hồ sơ với equipment, description, priority. Ví dụ: Tủ lạnh A, kiểm tra gioăng, Thường.

## Bước 4 — xử lý hồ sơ

Chuyển draft → submitted. Người quản lý khác người tạo phê duyệt nếu quy tắc differentActor yêu cầu. Ghi lý do ở bước yêu cầu reasonRequired. Đối chiếu lịch sử.

## Bước 5 — mở rộng và nâng cấp

Thêm một trường text tùy chọn, xem kế hoạch và áp dụng với baseVersion đúng. Với gói hai ứng dụng, thử [operations.json](../../examples/bundles/operations.json).

```bash
node tools/dxtrace.mjs bundle-lint examples/bundles/operations.json
node tools/dxtrace.mjs bundle-plan examples/bundles/operations.json
```

Kế hoạch offline giả định kho trống; kế hoạch API mới dùng dữ liệu hiện có. Gói từ chối toàn bộ nếu một mô hình không tương thích.

## Tiêu chí thành công

Mô hình xuất hiện trong danh sách app, biểu mẫu sinh từ định nghĩa, phân quyền đúng, hai lần gửi cùng khóa không tạo trùng và audit hợp lệ.

[Đặc tả manifest](manifest-reference.md) · [API examples](api-examples.md).
