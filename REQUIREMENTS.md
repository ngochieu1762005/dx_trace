# Đối chiếu DX-TRACE với bài toán DX-OS Open-Core

Bảng dưới dẫn đến phần triển khai và cách kiểm tra cho từng hạng mục. Môi trường tham chiếu là [bản chạy trên server riêng](selfhost/README.md).

| Hạng mục | Minh chứng trong mã | Cách kiểm tra |
| --- | --- | --- |
| Danh tính và phân quyền | [Realm OIDC](selfhost/realm.json), [kiểm tra quyền nghiệp vụ](lib/domain.mjs) | Dùng hai tài khoản quản lý và chỉ xem để mở cùng kho. Kiểm tra quyền duyệt sự cố. |
| Cổng truy cập | [Caddyfile](selfhost/Caddyfile), [Compose](selfhost/compose.yaml) | Kiểm tra tuyến web qua proxy đăng nhập và tuyến gửi nhiệt độ xác thực bằng khóa. |
| Dữ liệu cấu trúc và tệp | [Migration](drizzle/), [runtime tự triển khai](selfhost/runtime.mjs) | Truy xuất một lô, đính kèm tệp, kiểm tra snapshot cùng các đối tượng sau phục hồi. |
| Quy trình | [Quy trình đề xuất](lib/workflow.mjs), [quy trình thu hồi](lib/domain.mjs) | Thử duyệt đề xuất bằng hai vai trò. Thử đóng sự cố khi vẫn còn hàng phải thu. |
| Dùng chung giữa ứng dụng | [API](app/api/%5B...path%5D/route.ts) | Trong cùng phiên, mở Truy xuất và Đề xuất nội bộ. Kiểm tra danh mục tại `/api/platform`. |
| H–P–D–I trong kho | [Bộ mẫu](lib/demo.mjs), [tổng hợp tác động](lib/impact.mjs) | Theo dõi vai trò người xử lý, đầu dò gắn lô, phiếu phân phối và kết quả tính phạm vi thu hồi. |

## Hồ sơ nguồn mở

| Nội dung đối chiếu | Tệp hoặc thao tác |
| --- | --- |
| Giấy phép | [MIT](LICENSE); phông chữ và thành phần phân phối kèm giữ giấy phép riêng. |
| Build từ mã nguồn | [Hướng dẫn tự triển khai](selfhost/README.md), [Dockerfile](selfhost/Dockerfile), [lockfile](pnpm-lock.yaml). |
| Báo lỗi và theo dõi thay đổi | [Mẫu issue](.github/ISSUE_TEMPLATE/bug_report.md), [hướng dẫn đóng góp](CONTRIBUTING.md), [changelog](CHANGELOG.md). |
| Phát hành phiên bản | [Workflow](.github/workflows/release.yml) tạo gói nguồn và checksum. Khi nộp bài, bổ sung URL kho công khai và URL release đã phát hành thực tế. |

## Giới hạn cần thể hiện khi trình diễn

Dữ liệu kho thực hành được tạo bằng bộ mẫu. Việc gửi số đo từ một đầu dò vật lý, cấp chứng chỉ cho tên miền công cộng và phục hồi toàn bộ realm danh tính cần được kiểm tra trên máy chủ triển khai. Quy trình duyệt hiện được định nghĩa trong mã. Lịch sử thao tác dùng cho đối chiếu nghiệp vụ; quản trị viên cơ sở dữ liệu vẫn có quyền truy cập dữ liệu gốc.
