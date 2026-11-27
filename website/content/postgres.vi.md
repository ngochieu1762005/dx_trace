<!-- SPDX-FileCopyrightText: 2026 DX-TRACE contributors
SPDX-License-Identifier: MIT
DX-TRACE project authors: Đặng Nhật Minh, Nguyễn Ngọc Hiếu
-->
# Chạy thử chuyển dữ liệu sang PostgreSQL

Core lưu dữ liệu nghiệp vụ trong SQLite. Công cụ xuất tạo bản SQL để thử nhập vào một cơ sở PostgreSQL 17 độc lập. Dịch vụ Keycloak sử dụng cơ sở dữ liệu riêng.

## Trình tự kiểm tra

1. Tạo và xác minh bản sao lưu SQLite cùng các tệp đính kèm.
2. Chạy `node tools/export-postgres.mjs /private/backup /private/new-export.sql` bằng Node.js 24. Tệp đầu ra phải chưa tồn tại và chứa dữ liệu riêng của kho.
3. Kết nối tới cơ sở thử nghiệm trống dùng UTF-8 rồi chạy `psql -X -v ON_ERROR_STOP=1 -f /private/new-export.sql`. Công cụ tạo schema `dxtrace_import`, kiểm số dòng và SHA-256 của từng bảng trước khi hoàn tất giao dịch.
4. Giữ lại bản sao lưu và thư mục tệp gốc. Đối chiếu tài khoản Keycloak và cấu hình dịch vụ theo [hướng dẫn sao lưu](backup-restore.md).

Nếu schema đích đã tồn tại hoặc phép đối chiếu sai, giao dịch nhập bị hủy. Bản xuất phục vụ diễn tập chuyển dữ liệu. Core của phiên bản này vẫn đọc và ghi SQLite.
