# Thực thi nhánh song song và bộ đếm giờ

Mô hình có thể khai báo `orchestration` cùng các trường, quyền và quy trình thông thường. Trong [ví dụ bảo trì](../../examples/maintenance/process.parallel.json), sau khi tiếp nhận, một nhánh thẩm định chất lượng và nhánh còn lại chờ đến hạn rồi chuyển chủ kho xác nhận. Quy trình chỉ đi tiếp khi cả hai nhánh hoàn tất.

## Theo dõi một hồ sơ

Chủ kho xem trước định nghĩa rồi áp dụng mô hình có phiên bản. Khi mở hồ sơ, người dùng nhận các tác vụ theo vai trò. Mốc hẹn giờ được lưu theo UTC và tồn tại qua lần khởi động lại Core. Với hồ sơ đã gắn quy trình, thao tác chuyển trạng thái cũ bị khóa để mọi quyết định đi qua đúng tác vụ.

## Tái lập bài kiểm

```sh
node --test tests/process-runtime.test.mjs tests/process-platform.test.mjs tests/process-timer.test.mjs tests/process-bpmn.test.mjs
```

Bộ thực thi này hỗ trợ tập phần tử khai báo của DX-TRACE. Quy trình thẩm định chạy bằng dịch vụ Flowable có [hướng dẫn riêng](../../docs/NATIVE-REVIEW.md).
