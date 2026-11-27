# DX-TRACE — Ghi chú phát hành

**Bản phát hành gần nhất: v0.2.0.** Xem [changelog](../../CHANGELOG.md) để đối chiếu thay đổi giữa các tag.

| Phiên bản | Ghi chú | GitHub Release |
| --- | --- | --- |
| Chưa phát hành | [Thay đổi đang phát triển](UNRELEASED.md) | Chưa có tag |
| **v0.2.0** | [Nền tảng phát triển ứng dụng](RELEASE_NOTES_v0.2.0.md) | [Tải v0.2.0](https://github.com/ngochieu1762005/dx_trace/releases/tag/v0.2.0) |
| **v0.1.0** | [AppKit, Flowable và Evidence Engine](RELEASE_NOTES_v0.1.0.md) | [Tải v0.1.0](https://github.com/ngochieu1762005/dx_trace/releases/tag/v0.1.0) |
| **v0.0.7** | [Quy trình song song và API OIDC](RELEASE_NOTES_v0.0.7.md) | [Tải v0.0.7](https://github.com/ngochieu1762005/dx_trace/releases/tag/v0.0.7) |
| v0.0.6 | [Cổng kiểm định độc lập và AppKit](RELEASE_NOTES_v0.0.6.md) | [Tải v0.0.6](https://github.com/ngochieu1762005/dx_trace/releases/tag/v0.0.6) |
| v0.0.5 | [Mở rộng lõi và nghiệp vụ kho](RELEASE_NOTES_v0.0.5.md) | [Tải v0.0.5](https://github.com/ngochieu1762005/dx_trace/releases/tag/v0.0.5) |
| v0.0.4 | [Điều hướng kho và quét mã](RELEASE_NOTES_v0.0.4.md) | [Tải v0.0.4](https://github.com/ngochieu1762005/dx_trace/releases/tag/v0.0.4) |
| v0.0.3 | [Giao diện và khôi phục phiên](RELEASE_NOTES_v0.0.3.md) | [Tải v0.0.3](https://github.com/ngochieu1762005/dx_trace/releases/tag/v0.0.3) |
| v0.0.2 | [Lõi DX-OS và triển khai dịch vụ](RELEASE_NOTES_v0.0.2.md) | [Tải v0.0.2](https://github.com/ngochieu1762005/dx_trace/releases/tag/v0.0.2) |
| v0.0.1 | Bản đầu tiên (chưa có file release notes riêng) | [Tải v0.0.1](https://github.com/ngochieu1762005/dx_trace/releases/tag/v0.0.1) |

Chi tiết thay đổi liên phiên bản: [CHANGELOG.md](../../CHANGELOG.md).

Để phát hành các phiên bản tiếp theo, thêm `RELEASE_NOTES_vX.Y.Z.md` vào thư mục này; workflow `.github/workflows/release.yml` sẽ sử dụng file tương ứng nếu có.


## Chọn tệp để kiểm tra v0.2.0

| Tệp | Mục đích |
| --- | --- |
| `DX-TRACE-v0.2.0.tar.gz` | Dựng sản phẩm từ đúng mã nguồn của tag |
| `dxtrace-sdk-0.2.0.tgz` | Cài thư viện JavaScript vào dự án ứng dụng khách |
| `DX-TRACE.spdx.json`, `SHA256SUMS` | Đối chiếu danh mục thành phần và tính toàn vẹn từng tệp |
| `clean-install.log` | So kết quả chạy cục bộ với lần cài sạch khi phát hành |
| Gói bằng chứng và khóa công khai mẫu | Thực hành kiểm chữ ký trên dữ liệu tổng hợp |

Tải toàn bộ các tệp có tên trong bản kê rồi chạy `sha256sum -c SHA256SUMS`. Xem [hướng dẫn dựng và cài](../build-from-source.md) để chạy lại từ archive đã kiểm tra.
