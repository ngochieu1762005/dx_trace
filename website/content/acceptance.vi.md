<!-- SPDX-FileCopyrightText: 2026 DX-TRACE contributors
SPDX-License-Identifier: MIT
DX-TRACE project authors: Đặng Nhật Minh, Nguyễn Ngọc Hiếu
-->
# Nghiệm thu bản phát hành

Mỗi kết quả cần gắn với tag, mã commit, ngày chạy và môi trường. Từ cùng một tag, có thể kiểm lại một bản cài cục bộ, một lần chạy CI và một hệ thống triển khai riêng.

| Nội dung | Cách kiểm tra | Dấu hiệu đạt |
| --- | --- | --- |
| Nguồn và bản cài | Tải các tệp phát hành, đối chiếu mã băm rồi chạy bộ kiểm cài ngoài thư mục nguồn | Gói khớp bản kê, giao diện và CLI hoạt động sau khi xóa nguồn giải nén |
| Đăng nhập một lần | Hai tài khoản trong cùng kho lần lượt mở cổng truy xuất và cổng kiểm định sau khi đăng nhập | Cả hai vào đúng kho, dùng được cùng phiên khi chuyển ứng dụng |
| Phân quyền | Thành viên thử lập kế hoạch cài ứng dụng dành cho chủ kho | HTTP 403 với thành viên |
| Cách ly kho | Trong hai kho thử, mỗi bên tạo một phiếu có nhãn riêng rồi tìm cả hai nhãn | Mỗi bên tìm thấy phiếu của mình và không thấy phiếu của kho kia |
| Phục hồi | Khôi phục dữ liệu kho và danh tính vào môi trường tách biệt | Kiểm được tính toàn vẹn và mở được hồ sơ mẫu sau khi đăng nhập |

## Bằng chứng có thể kiểm tra công khai

Với v0.2.0, [quy trình phát hành](https://github.com/ngochieu1762005/dx_trace/actions/runs/45970871898) ghi lại kết quả cài sạch và kiểm thử tích hợp. [CI của cùng commit](https://github.com/ngochieu1762005/dx_trace/actions/runs/45970856284) cung cấp kết quả kiểm mã nguồn, container và SBOM. Các kết quả này xác nhận môi trường được ghi trong từng lần chạy. Nghiệm thu máy chủ triển khai cần kết quả đo trực tiếp ở máy chủ đó.

[Hướng dẫn dựng từ mã nguồn](../../docs/build-from-source.md) · [Đối chiếu sáu tiêu chí PoF](../../docs/olp-compliance.md)
