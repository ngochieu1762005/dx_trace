# Hai bài demo nghiệm thu

## Cài ứng dụng bảo trì

Dùng bản cài và PATH trong [hướng dẫn build](build-from-source.md). Mở terminal trong thư mục dành cho extension. Với demo loopback, CLI dùng mặc định cổng 8080. Với SSO, đặt `DXTRACE_URL` bằng origin của ứng dụng và cung cấp cookie phiên owner qua biến môi trường `DXTRACE_COOKIE`. Có thể chọn kho thực hành bằng `DXTRACE_AREA=training`.

```sh
dxtrace app init maintenance
dxtrace app validate ./maintenance
dxtrace app install ./maintenance
dxtrace app list
```

Mở `/maintenance` (thêm `?area=training` khi demo trong kho thực hành), tạo phiếu, chuyển sang submitted. Đăng nhập bằng tài khoản quản lý khác trong cùng workspace để duyệt. Tăng `metadata.version` trong `maintenance/app.yaml` lên `1.1.0` rồi chạy:

```sh
dxtrace app upgrade maintenance
dxtrace app rollback maintenance
dxtrace app uninstall maintenance
```

Để trình diễn hai schema, dùng gói [examples/maintenance](../examples/maintenance/app.yaml) với thư mục hiện tại là `examples`, bỏ bước init. Gỡ app đóng route và ẩn model; cài lại sẽ kiểm tương thích và khôi phục quyền truy cập vào hồ sơ. [Test cô lập hai ứng dụng](../tests/package-lifecycle.test.mjs)

## Từ kiểm định không đạt đến thu hồi

Trên Quality Portal có bật overlay, lập phiếu, gửi thẩm định và dùng người khác từ chối kết quả. Chọn **Cách ly & mở sự cố** cho lô chưa có sự cố mở. Trong hồ sơ đã liên kết, chọn **Tác vụ thu hồi · Flowable**. Người có vai trò phù hợp xác nhận từng bước và ghi lý do. Sau timer, tải lại tác vụ để duyệt quyết định cuối. Nút **Đồng bộ với Flowable** tiếp tục ca đã cách ly khi kết nối gián đoạn.

Dùng stack thử nghiệm và lô tổng hợp. [Workflow CI](../.github/workflows/third-party-core.yml) tạo credential tạm, chạy APISIX, Core, Flowable, PostgreSQL và [kịch bản HTTP](../selfhost/scripts/third-party-smoke.mjs). Tại mỗi bước giữ mã incident, instance và mã lô.

| Thao tác | Kết quả cần quan sát |
| --- | --- |
| POST /api/quality-recalls/start với lot, reason, severity và Idempotency-Key | Core cách ly lô, khởi chạy Flowable và trả về incident, workflow.id và tasks |
| POST /api/shipments cho chính lô đó | HTTP 409; trạng thái tồn vẫn quarantine |
| Duyệt trực tiếp /api/incidents/{id}/approve hoặc tự duyệt task | HTTP 409 hoặc 403; lô vẫn bị giữ |
| POST /api/quality-recalls/{incident}/complete với taskId, approved và reason | Hai bước inventory, quality hội tụ; sau timer xuất hiện approval |
| Quản lý khác người báo cáo hoàn tất approval | Flowable kết thúc accepted; API state hiển thị recall và audit-ledger/verify trả valid |
| Engine hoặc kết nối bị gián đoạn | Xem GET /api/quality-recalls/{incident}; POST cùng đường dẫn với /sync để gắn hoặc chiếu lại kết quả. Nếu chưa có instance, GET trả workflow null. Dùng lại idempotency key của báo cáo để tìm ca sau mất phản hồi. |

Nếu đã gửi start nhưng chưa biết kết quả, adapter tra lịch sử bằng tenant và business key. Khi engine không có bằng chứng xác định, hệ thống giữ lô cách ly và trả 409 để người vận hành đối chiếu. Chụp bằng chứng với dữ liệu tổng hợp. CI kiểm chính sách tại mạng nội bộ rồi chạy [hai lượt đăng nhập Keycloak qua HTTPS](../selfhost/scripts/sso-smoke.py) trên realm tạm để mở cả ba portal. Nghiệm thu [SSO trên VPS](ACCEPTANCE-2026.md) dùng tài khoản thuộc hệ thống triển khai thực tế.
