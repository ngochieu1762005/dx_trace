# Tài liệu DX-TRACE

Nền tảng chuyển đổi số nguồn mở cho chuỗi cung ứng, truy xuất thực phẩm và điều phối thu hồi. Một lõi dùng chung cho danh tính, dữ liệu, phân quyền và quy trình nghiệp vụ.

![Kiến trúc DX-TRACE](../../docs/assets/architecture-current.svg)

## Bắt đầu khám phá

- [Bắt đầu nhanh](quickstart.md) — chạy demo cục bộ.
- [Headless Core](../../docs/HEADLESS-CORE.md) — hiểu kiến trúc và ranh giới tin cậy.
- [AppKit v2](../../docs/APPLICATION-BUNDLES.md) — đóng gói và cài đồng thời nhiều mô hình.
- [HTTP API](../../docs/API.md) — tích hợp ứng dụng.
- [Triển khai Docker](../../selfhost/README.md) — vận hành thực tế.

## Năng lực nền tảng

| Thành phần | Chức năng |
| --- | --- |
| Identity | Keycloak và OAuth2 Proxy |
| API Gateway | Chính sách truy cập và cách ly Core |
| Headless Core | Nghiệp vụ, dữ liệu, quyền và audit |
| AppKit | Biểu mẫu khai báo, workflow và gói nghiệp vụ |
| Process Runtime | Tập con BPMN, fork/join và timer |
| Data Governance | Catalog, kiểm tra và thống kê độ đầy đủ dữ liệu |
| Quality Portal | Ứng dụng kiểm định độc lập |

## Phiên bản và minh chứng

Tài liệu được dựng từ mã nguồn hiện tại, không đồng nghĩa mọi tính năng thuộc bản phát hành v0.0.7 hoặc đã được triển khai trên VPS. PostgreSQL có công cụ chuyển đổi được kiểm thử; runtime vẫn dùng SQLite. SSO thực tế và vận hành ClamAV cần nghiệm thu riêng. Xem [ma trận minh chứng](../../docs/EVIDENCE.md), [CI](https://github.com/ngochieu1762005/dx_trace/actions) và [releases](https://github.com/ngochieu1762005/dx_trace/releases).

## Giấy phép

MIT · DX-TRACE contributors. [Đóng góp](../../CONTRIBUTING.md) · [Bảo mật](../../SECURITY.md).
