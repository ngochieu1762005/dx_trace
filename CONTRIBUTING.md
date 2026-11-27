# Đóng góp cho DX-TRACE

[Đặng Nhật Minh và Nguyễn Ngọc Hiếu](AUTHORS.md) cùng phát triển dự án. Nguyễn Ngọc Hiếu duy trì kho mã và xem xét các đề xuất đóng góp. Tuân thủ [quy tắc ứng xử](CODE_OF_CONDUCT.md).

[Kiến trúc](docs/HEADLESS-CORE.md) · [Bản đồ mã nguồn](docs/CODEBASE.md) · [Bảo mật](SECURITY.md).

## Chuẩn bị và kiểm tra

Dùng Node.js 24, pnpm 11.25.0; chạy tại gốc repository:

```bash
npx --yes pnpm@11.25.0 install --frozen-lockfile
npm run build
npm test
python3 -m unittest discover -s tests -p '*_test.py'
```

`npm run demo` chạy loopback với dữ liệu riêng. Không có script dev/hot reload mặc định; chạy lại build/demo sau khi sửa giao diện. Python dùng cho kiểm tra routing và script triển khai, không phải backend nghiệp vụ.

## Báo lỗi

Dùng [mẫu issue](.github/ISSUE_TEMPLATE/bug_report.md), ghi version/commit, chế độ chạy, vùng kho, vai trò, bước tái hiện và kết quả mong đợi. Với lỗi số lượng, kèm dữ liệu mô phỏng trước/sau. Không gửi cookie, token, email thật, dump DB hoặc `.env`. Lỗ hổng dùng quy trình [SECURITY](SECURITY.md).

## Quy tắc thay đổi

- Giữ kiểm quyền và quy tắc ở server; không dựa vào nút bị ẩn trên UI.
- Bảo toàn idempotency, version và vùng kho trên mọi thao tác ghi.
- Migration phải có kiểm tra dữ liệu cũ, chạy lại, lỗi/rollback và hướng dẫn phục hồi.
- Khi sửa mô hình/endpoint, cập nhật API, ví dụ và giới hạn tương ứng.
- Không đưa gói sinh, `node_modules`, dữ liệu chạy thử hoặc cấu hình máy vào Git.
- Giữ giấy phép và nguồn của thư viện/tài sản; không thêm khẳng định hiệu năng chưa có phép đo.

## Chọn kiểm thử

| Thay đổi | Nhóm kiểm tra |
| --- | --- |
| Tồn/giao/thu hồi | domain, impact, inventory-view |
| QR và ảnh | scan, label-image; camera thật sau đó |
| Phiên/route | session, landing_routing, headless-core |
| Mô hình/workflow | platform, platform-api, platform-storage, bpmn |
| Cài ứng dụng khai báo | appkit, appkit-api |
| Ghi đồng thời | workspace-queue, platform-api, selfhost |
| Webhook | webhook; xác minh chữ ký, retry và chống trùng phía nhận |

Chạy kiểm tra phù hợp và toàn bộ bộ kiểm trước khi merge thay đổi chức năng. Sửa tài liệu thuần túy kiểm đường dẫn, lệnh và đối chiếu source; không thêm test chỉ lặp lại câu chữ.

## Pull request

Nêu vấn đề cụ thể, hành vi sau sửa, kiểm thử và ảnh hưởng đến dữ liệu. Ảnh giao diện dùng dữ liệu mô phỏng. Ghi rõ kiểm tra nào chưa chạy; không ghi “không còn bug” chỉ vì CI xanh. Changelog có mục Unreleased cho thay đổi chưa gắn tag.

## Phát hành

Đồng bộ version ứng dụng trong package/API, README, changelog và release notes. Không đổi version định dạng Prometheus chỉ vì tăng version sản phẩm. Không sửa tag đã phát hành để thay source âm thầm.

Workflow `release.yml` kiểm tag `v*` hoặc workflow_dispatch rồi đóng gói tarball/checksum. `publish-v0.0.5.yml` là workflow xuất bản riêng cho v0.0.5, có thêm ZIP và kiểm container; không dùng nó để phát hành version khác. Các workflow cũ là lịch sử, không phải đường mặc định.

Tải các asset trong cùng thư mục và chạy `sha256sum -c SHA256SUMS`. Đọc cảnh báo migration trước nâng cấp. Phát hành GitHub không cập nhật VPS; xem [OPERATIONS](selfhost/OPERATIONS.md).
