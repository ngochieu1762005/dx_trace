<!-- SPDX-FileCopyrightText: 2026 DX-TRACE contributors
SPDX-License-Identifier: MIT
DX-TRACE project authors: Đặng Nhật Minh, Nguyễn Ngọc Hiếu
-->
# Sao lưu và khôi phục

## Phạm vi dữ liệu

| Thành phần | Phương pháp |
| --- | --- |
| Warehouse SQLite | Script backup dùng VACUUM INTO |
| File objects | Sao chép content-addressed objects và kiểm SHA-256 |
| Keycloak | pg_dump database identity |
| Cấu hình | .env, Compose, Caddyfile, commit |
| Audit | Kiểm ledger, giữ checkpoint bên ngoài |

## Quy trình

1. Chọn cửa sổ bảo trì, giảm/khóa thao tác ghi; lưu commit đang chạy.
2. Dùng [lệnh backup chính thức](../../selfhost/OPERATIONS.md) với đúng Compose.
3. Xác minh COMPLETE, checksum tệp và integrity.
4. Sao lưu ra nơi riêng có kiểm soát truy cập.
5. Thử phục hồi vào volume/môi trường trống, cùng phiên bản và cấu hình.
6. Kiểm tài khoản, dữ liệu, quyền, ledger, tệp và các luồng nghiệp vụ.

Không restore đè DB production, không dùng --clean trên DB đang phục vụ. Backup DB kho và identity không phải một giao dịch chung. Thay tag không hoàn tác migration hoặc dữ liệu mới.

## Chuyển dữ liệu sang PostgreSQL

[Hướng dẫn migration](../../docs/POSTGRES-MIGRATION.md) xuất từ backup hoàn chỉnh, xác minh row count và digest từng bảng trong PostgreSQL. Runtime chưa chuyển sang PostgreSQL; không trỏ app vào schema import.

## Đối chiếu sau khi phục hồi thử

Trước khi sao lưu, ghi lại mã một lô đang hoạt động, một phiếu đã giao và một hồ sơ đang xử lý. Nếu kho có tệp đính kèm, chọn một tệp để đối chiếu. Sau khi phục hồi vào môi trường riêng, đăng nhập đúng không gian, tìm lại từng mã và so điểm nhận, số lượng, trạng thái cùng lịch sử. Mở tệp và đối chiếu checksum với bản sao lưu.

Ghi riêng thời điểm sao lưu kho và danh tính. Nếu hồ sơ còn nhưng người dùng không đăng nhập được, kiểm tra phần phục hồi Keycloak và đường callback trước khi kết luận dữ liệu kho bị mất.
