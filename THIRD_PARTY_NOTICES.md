# Thành phần thứ ba và thông báo nguồn

[Giấy phép dự án](LICENSE) · [Phụ thuộc](DEPENDENCIES.md) · [Tác giả](AUTHORS.md)

Mã nguồn do dự án phát hành áp dụng MIT theo `LICENSE`. Thư viện, runtime, image, font, biểu trưng và dữ liệu ngoài giữ giấy phép của chủ sở hữu tương ứng. Tài liệu này là bản chỉ dẫn nguồn, không đổi giấy phép của bất kỳ thành phần nào.

| Nhóm | Nguồn và thông báo cần giữ |
| --- | --- |
| Thư viện npm trực tiếp | Bảng tên, phiên bản, giấy phép tại [DEPENDENCIES](DEPENDENCIES.md); giữ LICENSE/NOTICE đi kèm gói khi phân phối theo điều khoản của gói |
| Thư viện gián tiếp | [Lockfile](pnpm-lock.yaml) và [danh mục](docs/DEPENDENCIES.md); giấy phép cần kiểm theo bản gói thực tế, không suy ra từ thư viện cha |
| Runtime và container | Dùng bản phân phối upstream qua Docker; điều khoản của Node.js, hệ điều hành và các gói trong image vẫn áp dụng |
| Google Sans | [LICENSE.txt](public/fonts/google-sans/LICENSE.txt) đi cùng font, khai báo SIL OFL 1.1; giữ thông báo khi phân phối font |
| Biểu trưng công nghệ | [Nguồn biểu trưng](docs/assets/LOGOS.md), [Devicon license](docs/assets/DEVICON-LICENSE.txt); nhãn hiệu thuộc chủ sở hữu tương ứng |
| Open Food Facts | Kết quả tra cứu API ghi `source`, URL nguồn và `license: ODbL`; không đồng nhất dữ liệu sản phẩm với chứng nhận an toàn hoặc hồ sơ nguồn gốc lô |
| Dữ liệu kho thực hành | Bộ mô phỏng trong [lib/demo.mjs](lib/demo.mjs); không mô tả là dữ liệu vận hành của doanh nghiệp |

Không có tuyên bố rằng các nhà cung cấp công nghệ tài trợ hoặc chứng nhận DX-TRACE. Khi bổ sung tài sản ngoài, ghi URL nguồn, phiên bản nếu có và điều khoản phân phối; không xóa thông báo bản quyền sẵn có.
