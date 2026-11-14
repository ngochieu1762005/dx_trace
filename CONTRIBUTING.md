# Đóng góp cho DX-TRACE

## Tái hiện vấn đề

Tạo issue theo [mẫu báo lỗi](.github/ISSUE_TEMPLATE/bug_report.md). Ghi màn hình, vai trò, kho đang dùng, dữ liệu đầu vào, kết quả mong đợi và kết quả thực tế. Nếu lỗi liên quan đến tồn hoặc thu hồi, cung cấp mã lô mẫu và số lượng trên từng phiếu. Khi đính kèm log, loại bỏ khóa thiết bị, cookie phiên và thông tin thành viên.

## Phát triển và xác minh

Từ thư mục gốc, dùng Node.js 24 và pnpm 11.25.0.

```sh
pnpm install --frozen-lockfile
node selfhost/build.mjs
node --test tests/*.test.mjs
```

| Loại thay đổi | Kiểm tra liên quan |
| --- | --- |
| Nhập, giữ, xuất, hủy hoặc nhận trả | [Kiểm thử nghiệp vụ](tests/domain.test.mjs) |
| Đối soát theo lô, điểm nhận và phiếu | [Kiểm thử phạm vi thu hồi](tests/impact.test.mjs) |
| Sửa định dạng tem | [Giải mã PNG về đúng mã lô](tests/label-image.test.mjs) |
| Phân quyền, cạnh tranh ghi hoặc phục hồi | [Kiểm thử HTTP bản tự triển khai](tests/selfhost.test.mjs) |

## Gửi bản sửa

Mỗi pull request nên mô tả một thay đổi mà người dùng hoặc người vận hành có thể kiểm tra. Ghi rõ bước tái hiện trước khi sửa và lệnh kiểm thử đã chạy. Nếu thay giao diện, đính kèm ảnh bằng dữ liệu kho thực hành. Nếu thay API hoặc cấu hình, cập nhật tài liệu tại thư mục liên quan và mô tả ảnh hưởng đến dữ liệu cũ.

## Phát hành

Trước khi gắn tag, đối chiếu phiên bản với changelog, kiểm tra build sạch từ lockfile và chạy toàn bộ bộ kiểm thử. [Workflow phát hành](.github/workflows/release.yml) xử lý tag bắt đầu bằng `v` và đóng gói mã nguồn kèm SHA-256 sau bước xác minh. Khi đã có release, tải gói từ trang release và chạy `sha256sum -c SHA256SUMS` trong cùng thư mục để đối chiếu.
