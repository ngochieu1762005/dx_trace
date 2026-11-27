# Kiểm tra nguồn gốc bản phát hành

Mỗi bản phát hành có phiên bản Git tương ứng. Quy trình đóng gói tạo tệp nguồn bằng `git archive`, dựng bản cài ở bên ngoài thư mục nguồn và xuất danh mục thành phần phần mềm (SBOM) theo định dạng SPDX JSON.

## Đối chiếu tệp tải về

Với v0.2.0, tải đủ các tệp đính kèm được liệt kê trong `SHA256SUMS` từ [trang phát hành](https://github.com/ngochieu1762005/dx_trace/releases/tag/v0.2.0). Chạy các lệnh sau trong thư mục chứa các tệp:

```sh
sha256sum -c SHA256SUMS
gh attestation verify DX-TRACE-v0.2.0.tar.gz -R ngochieu1762005/dx_trace
```

Phép kiểm đầu đối chiếu từng tệp với bản kê. Phép kiểm thứ hai dùng GitHub CLI để kiểm chứng nguồn gốc gói mã nguồn. SBOM mô tả thành phần tìm thấy trong mã nguồn và các gói đã cài khi dựng, với phạm vi khác danh mục hệ điều hành của từng ảnh Docker.

[Danh mục phụ thuộc và giấy phép](../../DEPENDENCIES.md) · [Thông báo thành phần bên thứ ba](../../THIRD_PARTY_NOTICES.md)
