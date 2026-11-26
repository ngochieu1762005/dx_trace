# Đối chiếu PoF · OLP PMNM 2026

Mốc điểm lấy từ [thể lệ VFOSSA 2026, mục I](https://www.vfossa.vn/tin-tuc/the-le-olp-phan-mem-nguon-mo-nam-2026-760.html). Dùng bảng theo đúng tag nộp thi. CI trên nhánh phát triển chỉ chứng minh commit được kiểm thử. Điểm do BGK xác định.

| Mục | Điểm tối đa | Bằng chứng trực tiếp | Cách đối chiếu khi nộp |
| --- | ---: | --- | --- |
| 1. Quản lý mã nguồn | 5 | [Kho công khai](https://github.com/ngochieu1762005/dx_trace), [lịch sử commit](https://github.com/ngochieu1762005/dx_trace/commits/main/), [pull requests](https://github.com/ngochieu1762005/dx_trace/pulls) | Mở ẩn danh, xem file và lịch sử cộng tác. |
| 2. Giấy phép | 10 | [MIT toàn văn](../LICENSE), [mục đích và thông báo](../NOTICE), [SPDX theo tệp](../lib/app-package.mjs), [REUSE](../REUSE.toml), [tài sản bên thứ ba](../THIRD_PARTY_NOTICES.md) | Chạy reuse lint trên tag. Xét riêng khả năng phân phối các logo nhúng ghi ở [LOGOS](assets/LOGOS.md); lint chỉ kiểm metadata. |
| 3. Release phiên bản trước hạn | 5 | [Danh sách release](https://github.com/ngochieu1762005/dx_trace/releases), [v0.0.7](https://github.com/ngochieu1762005/dx_trace/releases/tag/v0.0.7), [tạo tar.gz và SHA256SUMS](../.github/workflows/release.yml) | Đối chiếu tag, thời gian, checksum và nội dung source archive. Gói AppKit lifecycle cần tag chứa thay đổi này. |
| 4. Cấu hình, dịch và chạy ngoài source | 10 | [Hướng dẫn Linux](build-from-source.md), [cài từ nguồn](../scripts/clean-install.sh), [test chính archive](../scripts/verify-release.sh), [lịch sử release CI](https://github.com/ngochieu1762005/dx_trace/actions/workflows/release.yml) | Mở log của đúng SHA. Script build bằng Node/pnpm/Vite, xóa nguồn giải nén rồi chạy web, API và CLI trên bản cài. |
| 5. Quản lý phụ thuộc | 10 | [Lockfile](../pnpm-lock.yaml), [phạm vi và giấy phép](dependency-licenses.md), [kiểm SBOM SPDX](../tools/validate-sbom.mjs), [Dockerfile](../selfhost/Dockerfile) | Đối chiếu SBOM ở release với tag, dependency hệ thống, nguồn upstream và nội dung tar.gz. |
| 6. Tài liệu và giao tiếp | 10 | [README](../README.md), [hướng dẫn demo](demo-guide.md), [CHANGELOG](../CHANGELOG.md), [Issues](https://github.com/ngochieu1762005/dx_trace/issues), [mẫu báo lỗi](../.github/ISSUE_TEMPLATE/bug_report.md), [đóng góp](../CONTRIBUTING.md) | Chạy lại hướng dẫn, mở bug tracker và kiểm changelog tương ứng từng phiên bản. |

Chỉ tự xác nhận một hàng sau khi kiểm đủ các điều kiện trên bản nộp. Lưu URL run, Git SHA, checksum, ngày kiểm và kết quả vào hồ sơ nghiệm thu. [Checklist vận hành và SSO](ACCEPTANCE-2026.md)
