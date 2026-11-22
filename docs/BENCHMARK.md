# Đo HTTP cục bộ cho hồ sơ mở rộng

Đo ngày 22/11/2026 trên dữ liệu tổng hợp. Đây là phép đo ngắn phục vụ tìm lỗi và kiểm tra thay đổi, **không phải công bố sức chứa người dùng thực hoặc so sánh trực tiếp với dự án khác**.

## Môi trường và phương pháp

- Node v24.22.3, Linux; CPU hệ thống báo INTEL(R) XEON(R) PLATINUM 8573C.
- Runtime báo 9 đơn vị song song khả dụng, tổng RAM hệ thống 9.73 GiB. Không đọc được giới hạn cgroup; không quy đổi kết quả thành cấu hình VPS tương đương.
- Một server Node + SQLite, client trên cùng máy, HTTP loopback. Danh tính thử được cung cấp qua header của harness; không đo đăng nhập Keycloak, TLS, gateway hay mạng Internet.
- Ban đầu 10.000 hồ sơ. Mỗi client lặp: tạo hồ sơ → chuyển trạng thái → đọc danh sách 50 hồ sơ. Trước mỗi mức có 20 lần đọc làm nóng. Dữ liệu ghi mới tích lũy giữa các mức.
- Mỗi mức phát tải 15 giây, chờ các yêu cầu cuối hoàn tất. Mỗi request timeout 10 giây. p95 tính trên toàn bộ yêu cầu, kể cả lỗi.
- Một lần chạy cho mỗi mức; chưa đo sai số giữa nhiều lần lặp hoặc tải kéo dài nhiều giờ.

## Kết quả

| Client đồng thời | Yêu cầu | Yêu cầu/giây | p95 (ms) | Lỗi |
| --- | --- | --- | --- | --- |
| 1 | 3615 | 240.87 | 8.63 | 0 |
| 10 | 3933 | 260.48 | 75.86 | 0 |
| 25 | 3588 | 234.35 | 250.15 | 0 |

Dữ liệu gốc gồm p50/p95/p99 từng loại yêu cầu, mã lỗi và SHA-256 của mã nguồn được đo: [platform-local.json](benchmarks/platform-local.json).

## Lỗi tìm thấy trong lần đo ban đầu

Ở bài đo 5 giây/mức với 10 client đồng thời, trước khi bổ sung hàng đợi có 236 phản hồi 409 trên 1.172 yêu cầu. Các lượt ghi độc lập tranh cùng revision workspace, hết số lượt thử lại dù không sửa cùng hồ sơ.

Sau khi thêm hàng đợi ghi theo workspace, chạy lại cùng cấu hình 5 giây/mức ghi nhận 0 lỗi trên 1.503 yêu cầu ở mức 10 client. Hàng đợi có giới hạn và vẫn giữ kiểm tra version hồ sơ; không bỏ kiểm soát xung đột để làm đẹp kết quả. Hai phép đo chạy nối tiếp trên môi trường dùng chung nên không dùng chênh lệch thông lượng để tuyên bố tăng tốc chính xác.

- [Trước sửa](benchmarks/platform-before-queue.json)
- [Sau sửa, cùng cấu hình ngắn](benchmarks/platform-after-queue.json)

## Tái lập

Từ gốc repository, dùng Node.js 24:

```bash
node tools/benchmark-platform.mjs --records 10000 --seconds 15 --levels 1,10,25 --out /tmp/dxtrace-load.json
```

Chỉ chạy trên máy phát triển/kiểm thử. Script tự tạo DB tạm, chỉ bind loopback cổng 38712 và tự dọn khi kết thúc. Không có tham số URL hay DB vận hành. Tránh chạy đồng thời nhiều bản benchmark do dùng cùng cổng. Muốn công bố năng lực triển khai, cần thêm bài đo toàn stack trên phần cứng cố định, nhiều lần lặp và dữ liệu lớn hơn.
