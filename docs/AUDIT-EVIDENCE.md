# Kiểm chứng nhật ký độc lập

Phạm vi: nhánh `main`, phần nâng cấp sau v0.0.7. Không áp dụng ngược cho archive v0.0.7.

DX-TRACE có thể xuất các sự kiện trong ledger dưới dạng JSON và kiểm tra chuỗi SHA-256 mà không cần kết nối Core. Chủ không gian hoặc quản lý mở **Nhật ký → Kiểm tra & chuẩn bị gói minh chứng**. Trình duyệt kiểm tra lại nội dung trả về trước khi cho tải gói nhật ký và mốc đối chiếu.

## Quy trình đối chiếu

1. Tải **gói nhật ký** và **mốc đối chiếu** của đúng kho.
2. Giữ mốc đối chiếu ở nơi độc lập với máy chủ, chẳng hạn kho lưu trữ chỉ người kiểm toán có quyền ghi. Gói sự kiện có thông tin người thực hiện và nội dung nghiệp vụ; giới hạn người được nhận.
3. Sau một kỳ vận hành, tải gói nhật ký mới.
4. Kiểm tra gói mới với mốc đã lưu từ lần trước:

```bash
node tools/verify-audit.mjs DX-TRACE-audit-250.json DX-TRACE-checkpoint-120.json
```

Kết quả thành công có `valid: true`, `anchored: true`, số sự kiện, số thứ tự cuối và hash cuối. Lệnh trả exit code `1` nếu nội dung bị sửa, mốc cũ bị mất, lịch sử bị cắt trước mốc hoặc mốc thuộc kho khác.

Chỉ kiểm tính nhất quán nội tại, không có mốc cũ:

```bash
node tools/verify-audit.mjs DX-TRACE-audit-250.json
```

Kết quả `anchored: false` có nghĩa chưa đối chiếu với mốc độc lập. Nó không xác nhận nguồn gốc hoặc danh tính người xuất tệp.

## Định dạng

`GET /api/audit-ledger/export` yêu cầu phiên đăng nhập với vai trò owner/manager. Thêm `?area=training` khi xuất kho thực hành. Nội dung gồm:

| Trường | Ý nghĩa |
| --- | --- |
| `schema` | `dxtrace.audit.v1` |
| `workspace` | Định danh vùng kho; không phải token |
| `exportedAt` | Thời gian máy chủ tạo gói |
| `events` | `seq`, `previous`, `hash`, `payload` nguyên văn |
| `checkpoint` | `workspace`, `entries`, `seq`, `head` |

Hash sự kiện = SHA-256 của `previous + "\n" + seq + "\n" + payload`. Payload được giữ nguyên chuỗi JSON để không đổi byte khi tái tuần tự hóa. Số thứ tự tăng dần nhưng có thể có khoảng trống do thay đổi revision ngoài ledger. Gói lớn hơn 10 MiB bị từ chối thay vì cắt mất lịch sử.

## Ranh giới tin cậy

Đây là hash chain với **mốc được người dùng giữ độc lập**, không phải chữ ký số, blockchain hay dịch vụ witness công khai. Người kiểm soát toàn bộ cơ sở dữ liệu có thể viết lại chuỗi và tạo gói tự nhất quán. Mốc cũ được bảo quản độc lập giúp phát hiện việc viết lại phần lịch sử đã được đối chiếu; nó không xác nhận tính đúng đắn của sự kiện mới hoặc phát hiện sự kiện chưa từng được ghi. Các thao tác trước khi ledger được bật không nằm trong gói này.

Mã: [bộ kiểm tra](../lib/audit-proof.mjs), [CLI](../tools/verify-audit.mjs). Bài kiểm: [sửa payload, viết lại chuỗi, cắt ngắn và nhầm kho](../tests/audit-proof.test.mjs).
