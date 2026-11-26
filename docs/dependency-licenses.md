# Kiểm kê phụ thuộc

| Phạm vi | Phiên bản và giấy phép | Minh chứng |
| --- | --- | --- |
| Runtime và UI | Bảng phụ thuộc trực tiếp, giấy phép upstream | [DEPENDENCIES](../DEPENDENCIES.md), [thông báo](../THIRD_PARTY_NOTICES.md) |
| Đọc manifest YAML | yaml 2.8.2, ISC, dùng trong CLI | [lockfile](../pnpm-lock.yaml), [license upstream](https://github.com/eemeli/yaml/blob/v2.8.2/LICENSE) |
| Phụ thuộc bắc cầu | Kiểm theo lockfile và SBOM của tag đang xét | [CI tạo SPDX](../.github/workflows/release.yml), [kiểm SBOM](../tools/validate-sbom.mjs) |
| Dịch vụ tích hợp | Image upstream và cấu hình phiên bản | [Compose](../selfhost/compose.yaml), [Flowable](../selfhost/compose.third-party.yaml) |
| Phông chữ, ảnh và logo | Thông báo riêng theo tài sản | [THIRD_PARTY_NOTICES](../THIRD_PARTY_NOTICES.md), [nguồn biểu trưng](assets/LOGOS.md) |

Source archive lấy từ Git. Node_modules và image được tải khi build. Bản kiểm kê npm không đại diện cho toàn bộ gói hệ điều hành trong image.
