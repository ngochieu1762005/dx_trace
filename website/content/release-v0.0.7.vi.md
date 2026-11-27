<!-- SPDX-FileCopyrightText: 2026 DX-TRACE contributors
SPDX-License-Identifier: MIT
DX-TRACE project authors: Đặng Nhật Minh, Nguyễn Ngọc Hiếu
-->
# DX-TRACE v0.0.7 · Cổng API và quy trình song song

Bản v0.0.7 tách cổng chính sách khỏi Core, bổ sung bộ thực thi quy trình có nhánh song song và bộ đếm giờ. API OIDC phiên bản 1 cho phép ứng dụng ngoài đọc các mô hình được quản trị viên cấp quyền.

## Nâng cấp từ v0.0.6

Sao lưu dữ liệu kho, PostgreSQL của Keycloak và cấu hình triển khai trước khi nâng cấp. Bổ sung khóa riêng cho kết nối từ ứng dụng đến cổng API. Kiểm tra cấu hình với đúng các tệp Docker Compose hiện dùng rồi kiểm lại đường đi từ ứng dụng tới Core. [Hướng dẫn vận hành](../../selfhost/OPERATIONS.md)

## Tái lập phiên bản

Tải gói nguồn, danh mục SPDX và bản kê mã băm từ [bản phát hành v0.0.7](https://github.com/ngochieu1762005/dx_trace/releases/tag/v0.0.7). Mở tài liệu tại chính tag để đối chiếu cấu hình và các bước kiểm thử của phiên bản này.
