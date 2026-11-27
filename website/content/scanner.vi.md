# Quét tệp và tra cứu danh mục dữ liệu

Cấu hình ClamAV bổ sung một dịch vụ quét riêng trong mạng nội bộ. Khi bật dịch vụ, Core chờ kết quả sạch trước khi lưu tệp tải lên. Tệp bị phát hiện trả HTTP 422. Khi dịch vụ quét không sẵn sàng, API trả 503. Các tệp đã lưu trước đó giữ kết quả cũ.

## Kiểm tra danh mục

Người dùng đã đăng nhập có thể gọi `GET /api/catalog` để xem mô hình mình được đọc trong kho hiện tại. Mỗi mục mô tả kiểu trường, ràng buộc, trạng thái quy trình và ánh xạ dữ liệu đã khai báo. Để xem danh mục và OpenAPI của ứng dụng mẫu từ mã nguồn, chạy:

```sh
node tools/dxtrace.mjs catalog examples/maintenance/app.json
node tools/dxtrace.mjs openapi examples/maintenance/app.json
node --test tests/platform-assurance.test.mjs
```

Bài kiểm dùng máy quét mô phỏng. Việc xác nhận ClamAV đã tải chữ ký và quét tệp thành công cần thực hiện trên môi trường triển khai thử.
