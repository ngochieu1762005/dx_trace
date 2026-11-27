<!-- SPDX-FileCopyrightText: 2026 DX-TRACE contributors
SPDX-License-Identifier: MIT
DX-TRACE project authors: Đặng Nhật Minh, Nguyễn Ngọc Hiếu
-->
# DX-TRACE v0.2.0 · Công cụ phát triển ứng dụng

Ứng dụng khách có thể dùng SDK JavaScript để đọc cấu trúc dữ liệu, tạo hồ sơ và chuyển bước qua API phiên bản 2. Quyền truy cập phụ thuộc vào ứng dụng khách, vai trò người dùng, mô hình và kho đã cấp.

## Kiểm tra một bản cài

Trong [bản phát hành](https://github.com/ngochieu1762005/dx_trace/releases/tag/v0.2.0), tải tệp nguồn, gói SDK, SBOM và các tệp còn lại trong bản kê. Đối chiếu mã băm rồi chạy [bài kiểm cài ngoài thư mục nguồn](../../docs/build-from-source.md). Gói bằng chứng tổng hợp đi kèm có thể dùng để thực hành kiểm chữ ký ngoại tuyến.

## Thay đổi nghiệp vụ

AppKit ghi bằng chứng theo khai báo và hỗ trợ kiểm lại chính sách khi ngoại tuyến. Trình thiết kế ứng dụng chỉnh được trường và vai trò chuyển bước. Flowable quản lý việc bàn giao sau bảo trì riêng với trạng thái sửa chữa. [API tích hợp và SDK](../../docs/EXTERNAL-API-V2.md)
