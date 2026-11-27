# Cài nhiều mô hình trong một giao dịch

Một gói AppKit v2 chứa tối đa 12 manifest v1. [Gói vận hành mẫu](../../examples/bundles/operations.json) cài mô hình bảo trì và duyệt mua sắm cùng lúc. Mỗi mô hình xuất hiện riêng trong danh sách ứng dụng của kho.

## Kiểm tra trước khi cài

```sh
node tools/dxtrace.mjs bundle-lint examples/bundles/operations.json
node tools/dxtrace.mjs bundle-plan examples/bundles/operations.json
```

Lệnh lập kế hoạch ngoại tuyến giả định kho trống. Để kiểm tra phiên bản và hồ sơ đang có, chủ kho mở **Gói nghiệp vụ · AppKit v2** rồi xem kế hoạch do máy chủ trả về.

## Áp dụng

`POST /api/apps/bundle-plan` trả phiên bản cơ sở và các điểm xung đột của từng mô hình. Khi cài qua `POST /api/apps/bundle-install`, gửi lại các phiên bản đó và một `Idempotency-Key`. Nếu một mô hình đã đổi hoặc không tương thích, Core từ chối cả gói. Khi thành công, thay đổi mô hình, kết quả yêu cầu và sự kiện nhật ký được ghi trong cùng giao dịch.
