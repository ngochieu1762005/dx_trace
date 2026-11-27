<!-- SPDX-FileCopyrightText: 2026 DX-TRACE contributors
SPDX-License-Identifier: MIT
DX-TRACE project authors: Đặng Nhật Minh, Nguyễn Ngọc Hiếu
-->
# Tài khoản, SSO và phân quyền

Keycloak xác thực danh tính; OAuth2 Proxy tạo phiên; Core kiểm tra thành viên và quyền. Quản trị Keycloak và chủ kho là hai vai trò khác nhau.

| Vai trò | Phạm vi điển hình |
| --- | --- |
| Chủ kho (`owner`) | Thành viên, cấu hình, mô hình, nghiệp vụ |
| Quản lý (`manager`) | Duyệt sự cố, thiết bị, nghiệp vụ theo model |
| Nhân viên kho (`warehouse`) | Nhập, giao, nhận trả và tác vụ được cấp |
| Người xem (`viewer`) | Tra cứu; model phải cho phép đọc |

## Tạo tài khoản chung kho

1. Quản trị viên tạo người dùng trong realm warehouse, email hợp lệ.
2. Chủ kho mời đúng email trước lần đăng nhập đầu tiên.
3. Người dùng đăng nhập qua ứng dụng.
4. Kiểm kho, vai trò và quyền bằng thao tác thực.

Một danh tính không có lời mời có thể được cấp workspace riêng. Không tạo lại người dùng chỉ vì nhìn thấy kho trống; kiểm vùng dữ liệu và email trước.

## Phân quyền mô hình

permissions.read và permissions.create quy định vai trò. scope là all hoặc own. scopeByRole cho phép điều chỉnh phạm vi từng vai trò được đọc. Owner không bị override. Model có thể giới hạn manager chỉ thấy hồ sơ của họ, nhưng điều đó cũng có thể chặn việc duyệt hồ sơ người khác.

## Nghiệm thu

Dùng ít nhất hai tài khoản thực; thử viewer ghi dữ liệu, người tạo tự duyệt khi differentActor bật, user ngoài workspace đọc model, thu hồi quyền. Không giả header danh tính trên Internet.

[Cổng API và đăng nhập một lần](../../docs/GATEWAY-AND-SSO.md) · [Phân quyền mô hình](../../docs/MODEL-ACCESS.md).

## Khi hai người thấy hai kho khác nhau

Mở cùng mã lô trên hai trình duyệt đã đăng nhập bằng hai tài khoản. So tên không gian, vùng thực hành/vận hành và email nhận lời mời trước khi so vai trò. Nếu cùng thấy lô nhưng chỉ một người thấy phiếu kiểm định, xem phạm vi đọc của mô hình. Quyền đọc hồ sơ và quyền chuyển bước được kiểm tra riêng.
