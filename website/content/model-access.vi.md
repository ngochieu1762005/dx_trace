# Phạm vi đọc hồ sơ theo vai trò

Trong mô hình, `permissions.scopeByRole` chỉ định vai trò nào xem tất cả hồ sơ và vai trò nào chỉ xem hồ sơ tự tạo. Ví dụ, `{"manager":"own","warehouse":"all"}` giới hạn quản lý ở hồ sơ của mình và cho nhân viên kho xem mọi hồ sơ của mô hình trong cùng kho. Các vai trò này phải có sẵn quyền đọc.

## Phạm vi áp dụng

Core lọc hồ sơ trước khi đếm hoặc phân trang. Thống kê chất lượng, danh sách tác vụ, chuyển bước và liên kết phiếu kiểm định cùng dùng phạm vi này. Chủ kho giữ quyền xem toàn bộ hồ sơ của mô hình mà mình được đọc.

Khi thiết kế bước duyệt độc lập, hãy kiểm tra đồng thời quyền xem hồ sơ và quyền chuyển bước. Quản lý có phạm vi `own` sẽ không duyệt được phiếu của nhân viên khác dù quy trình liệt kê vai trò quản lý.
