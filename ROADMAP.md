# Lộ trình phát triển

[Changelog](CHANGELOG.md) ghi thay đổi đã thực hiện; tài liệu này ghi trạng thái và tiêu chí cho bước tiếp theo. Người duy trì: [Nguyễn Ngọc Hiếu](AUTHORS.md). Không cam kết ngày hoàn thành khi chưa có kế hoạch phát hành.

## Đã phát hành — v0.0.5

- Core riêng, SSO, phân quyền và hai vùng dữ liệu kho.
- Lô hàng, giao nhận, truy xuất, cảm biến và thu hồi.
- Mô hình JSON, biểu mẫu và quy trình có điều kiện, lưu hồ sơ có chỉ mục.
- Nhật ký chuỗi hash, webhook ký HMAC, công cụ sao lưu và xác minh.
- Kiểm thử API/container và phép đo cục bộ có dữ liệu gốc.

## Đã có trên main — chưa phát hành thành tag mới

- AppKit: cài nghiệp vụ khai báo qua manifest và xem kế hoạch trước khi áp dụng.
- Xuất/nhập tập con BPMN 2.0, bảo toàn vai trò và điều kiện.
- Kiểm dấu hiệu bí mật trong nguồn tại CI.
- Google Sans, nhận diện xanh và cập nhật bộ tài liệu.

Các mục này không có trong ZIP v0.0.5. Để kiểm chứng dùng commit của `main`; để tái lập release dùng tag tương ứng.

## Ưu tiên tiếp theo

| Ưu tiên | Hạng mục | Điều kiện nghiệm thu |
| --- | --- | --- |
| 1 | Tự động kiểm đăng nhập SSO và phân quyền trên trình duyệt | Đăng nhập/đăng xuất, hết phiên, từ chối quyền và hai workspace qua gateway thật |
| 1 | Kiểm camera trên thiết bị thực | Danh sách máy/trình duyệt, mẫu EAN/QR, ánh sáng, kết quả khớp/chưa khớp có ghi nhận |
| 1 | Diễn tập phục hồi toàn stack | SQLite, tệp và Keycloak được khôi phục trên môi trường riêng, kiểm quyền và số liệu |
| 2 | Đo tải toàn stack | VPS cấu hình cố định, TLS/SSO, thời gian đo dài hơn, công bố latency/lỗi/tài nguyên |
| 2 | Quản lý chuỗi cung ứng phần mềm | SBOM, kiểm giấy phép gián tiếp, quét lỗ hổng và quy trình xử lý kết quả |
| 2 | Thử nghiệm cùng người vận hành | Kịch bản thực, số liệu trước/sau và phản hồi được phép công bố |

## Hướng nghiên cứu

BPMN tổng quát, editor kéo thả, object storage và HA cần thiết kế riêng, không được xem là chức năng hiện có. Chỉ chọn triển khai khi có nhu cầu, kế hoạch migration và kiểm thử đủ chứng minh. Đề xuất thay đổi qua [Issues](https://github.com/ngochieu1762005/dx_trace/issues).
