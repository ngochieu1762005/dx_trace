<!-- SPDX-FileCopyrightText: 2026 DX-TRACE contributors
SPDX-License-Identifier: MIT
DX-TRACE project authors: Đặng Nhật Minh, Nguyễn Ngọc Hiếu
-->
# Ma trận năng lực và giới hạn

Bảng mô tả mã nguồn main, không tự khẳng định mọi tính năng đã triển khai trên VPS hoặc đạt chứng nhận.

| Năng lực | Minh chứng nguồn | Giới hạn |
| --- | --- | --- |
| Headless Core | [Kiến trúc](../../docs/HEADLESS-CORE.md) | Cần kiểm môi trường chạy |
| SSO | [Gateway/SSO](../../docs/GATEWAY-AND-SSO.md) | Nghiệm thu với hai user thật |
| AppKit | [AppKit](../../docs/APPKIT.md) | Manifest không chạy code tùy ý |
| Bundles | [Application bundles](../../docs/APPLICATION-BUNDLES.md) | Không có khóa ngoại liên model |
| Quyền theo model | [Model access](../../docs/MODEL-ACCESS.md) | Vai trò cố định, chưa group provisioning |
| APISIX | [Gateway](../../docs/GATEWAY-AND-SSO.md) | Mặc định Compose; SSO live cần nghiệm thu |
| Flowable OSS | [Thẩm định](../../docs/NATIVE-REVIEW.md) | Overlay, không chuyển toàn bộ workflow |
| Bốn nguyên lý DX-OS | [Quản trị](../../docs/DXOS-GOVERNANCE.md) | Cold export, lineage cảm biến, IT/OT fixture, kiểm cấu hình CI; không phải lakehouse/GitOps controller |
| BPMN | [Runtime](../../docs/PROCESS-RUNTIME.md) | Tập con, không phải engine BPMN đầy đủ |
| Data Catalog | [Assurance](../../docs/PLATFORM-ASSURANCE.md) | Lineage khai báo cho model; truy vết quan sát cho cảm biến |
| Data quality | [Governance](../../docs/MODEL-GOVERNANCE.md) | Thống kê hiện diện không phải chứng nhận dữ liệu |
| File scanning | [Assurance](../../docs/PLATFORM-ASSURANCE.md) | Optional ClamAV, cần nghiệm thu thực |
| PostgreSQL | [Migration](../../docs/POSTGRES-MIGRATION.md) | Import offline, Core vẫn SQLite |
| Audit | [Audit evidence](../../docs/AUDIT-EVIDENCE.md) | Checkpoint ngoài DB để đối chiếu |
| Supply chain | [SBOM](../../docs/SUPPLY-CHAIN.md) | CI không thay thế audit bảo mật độc lập |

Đối chiếu commit, release, cấu hình triển khai và [CI](https://github.com/ngochieu1762005/dx_trace/actions) khi đánh giá.

## Chọn minh chứng cho từng loại kết quả

Đối với quyền duyệt, lưu kết quả bằng hai tài khoản và ID hồ sơ. Đối với thiết bị, ghi ID mẫu, thời điểm đo và lô nhận số liệu. Đối với phục hồi, tìm lại hồ sơ cũ trong môi trường phục hồi riêng. Gắn mỗi kết quả với commit và môi trường chạy để người tiếp nhận có thể làm lại cùng phép thử.
