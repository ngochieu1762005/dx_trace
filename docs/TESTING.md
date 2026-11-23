# Kiểm thử và tái lập kết quả

[Ma trận minh chứng](EVIDENCE.md) · [Benchmark](BENCHMARK.md) · [CI](../.github/workflows/ci.yml)

## Chuẩn bị

Từ gốc repository, dùng Node.js 24 và Python 3:

```bash
npx --yes pnpm@11.25.0 install --frozen-lockfile
npm run audit:secrets
npm run build
npm test
python3 -m unittest discover -s tests -p '*_test.py'
```

Secret gate đọc các tệp được Git theo dõi; chạy trong checkout Git để kiểm đúng phạm vi. Build tạo giao diện; bộ kiểm thử dùng dữ liệu thử. Không trỏ script thử nghiệm vào database hoặc tài khoản vận hành.

## Kiểm chứng ứng dụng độc lập (nhánh nâng cấp)

```sh
node --check apps/quality-portal/server.mjs
node --check apps/quality-portal/app.js
node --test tests/quality-portal.test.mjs tests/appkit.test.mjs
```

Bài kiểm chạy trên loopback, khởi động Core, web và Quality Portal trong ba process; kiểm tra manifest/entrypoint, phân quyền người duyệt, tenant isolation và khả năng Core sống khi portal bị dừng. CI bổ sung một kiểm tra container riêng. Các bài này không thay thử nghiệm OIDC/Keycloak trên VPS.

## Các lớp kiểm chứng

| Nhóm | Tệp kiểm thử tiêu biểu | Nội dung |
| --- | --- | --- |
| Nghiệp vụ kho | `domain`, `impact`, `inventory-view` | Tồn, phiếu, thu hồi, lọc và CSV |
| Mã QR/mã vạch | `scan`, `label-image` | Chuẩn hóa, đối chiếu và ảnh; không thay kiểm camera thật |
| Phiên và tách Core | `session`, `selfhost`, `headless-core` | Hết phiên, HTTP, token nội bộ và ranh giới dịch vụ |
| Mô hình và lưu trữ | `platform`, `platform-api`, `platform-storage`, `workspace-queue` | Quyền, version, migration, cách ly và ghi đồng thời |
| AppKit/BPMN trên main | `appkit`, `appkit-api`, `bpmn` | Manifest, cài app, XML round-trip, từ chối cấu trúc không hỗ trợ |
| Vận hành | `webhook`, `security-gate`, `branding`, Python routing | Chữ ký/retry, secret gate, nhận diện và route |

Các tên Node ở bảng tương ứng `tests/<tên>.test.mjs`. Ví dụ chạy riêng phần mới:

```bash
node --test tests/appkit.test.mjs tests/appkit-api.test.mjs tests/bpmn.test.mjs
```

CI có job `verify` chạy kiểm bí mật/build/Node/Python và job `container` dựng image, chạy app/Core riêng rồi kiểm bằng `selfhost/container-smoke.mjs`. Hai job đạt không đồng nghĩa đã thử toàn bộ luồng đăng nhập Keycloak hoặc camera thiết bị.

## Mốc phát hành và nhánh phát triển

v0.0.5 ghi nhận 40 kiểm thử Node.js và 3 Python ở thời điểm phát hành. Main bổ sung kiểm thử sau đó; dùng tổng kết của lần chạy tại commit tương ứng thay vì gán số của release cho mọi bản mới. [Changelog](../CHANGELOG.md) phân biệt hai phạm vi.

## Các kiểm tra thủ công cần ghi nhận

- SSO từ landing đến đúng kho, hết phiên, đăng xuất và quyền bị thu hồi.
- Hai tài khoản/không gian không đọc hoặc sửa dữ liệu lẫn nhau.
- Quét camera trên thiết bị dự kiến dùng; mã lạ, nhiều lô cùng barcode, ảnh thiếu sáng.
- Phục hồi SQLite/tệp và PostgreSQL Keycloak theo [OPERATIONS](../selfhost/OPERATIONS.md).
- Scanner, Groq và webhook với cấu hình thật nếu đưa các tích hợp này vào nghiệm thu.

## Báo cáo kết quả

Ghi SHA, hệ điều hành, phiên bản runtime, lệnh, kết quả và phần chưa kiểm. Lưu log đã loại dữ liệu nhạy cảm. Benchmark phải kèm workload và môi trường; không chuyển số request/giây cục bộ thành cam kết số người dùng thực.
