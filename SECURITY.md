# Bảo mật và báo cáo lỗ hổng

Phạm vi tài liệu: DX-TRACE v0.0.5. Dự án chưa công bố chính sách LTS/SLA; hãy đối chiếu bản phát hành và changelog trước khi triển khai.

## Báo cáo riêng

Không đưa lỗ hổng chưa khắc phục, bí mật hoặc dữ liệu người dùng vào issue công khai. Dùng chức năng private vulnerability reporting trong tab Security **nếu repository đã bật**; nếu chưa có, liên hệ maintainer qua kênh riêng đã xác minh. Không giả định một địa chỉ email hay SLA xử lý chưa được công bố.

Báo cáo nên có version/commit, điều kiện tái hiện, phạm vi ảnh hưởng và dữ liệu tổng hợp tối thiểu. Chỉ thử trên hệ thống bạn được phép kiểm tra.

## Ranh giới bảo vệ

- Caddy/OAuth2 Proxy cung cấp danh tính tin cậy; chặn truy cập trực tiếp vào app/Core từ mạng không tin cậy.
- Core không publish cổng host, yêu cầu token riêng; app không gắn volume dữ liệu kho.
- Vai trò nằm trong DB ứng dụng. API kiểm quyền, trạng thái và version trước ghi.
- Kho thực hành tách dữ liệu nhưng không phải môi trường sandbox cho mã tùy ý.
- Tệp kiểm định dạng/hash; chỉ download khi scanner xác nhận sạch. Không có scanner mặc định, không coi magic bytes là quét mã độc.
- Ledger phát hiện sửa chuỗi khi hash không được tính lại; quản trị viên có toàn quyền DB vẫn có thể viết lại. Không phải chữ ký số hoặc nhật ký bất biến có neo ngoài.

## Bí mật và dữ liệu

Không commit `.env`, cookie, khóa thiết bị, token Core/OIDC, SSH keys, dump DB, file người dùng hoặc cấu hình hạ tầng riêng. Giữ backup mã hóa ngoài VPS; tránh document root. Đọc [OPERATIONS](selfhost/OPERATIONS.md) để backup đúng cả SQLite, objects và Keycloak.

Nếu lộ khóa: thu hồi/đổi khóa trước, kiểm phạm vi sử dụng, sau đó xử lý bản sao và Git history có phối hợp. Xóa file hoặc force-push không làm khóa cũ mất hiệu lực và không xóa mọi fork/cache.

## Tích hợp ngoài

Groq có thể nhận câu hỏi, SOP và ngữ cảnh kho khi bật. Scanner nhận nội dung tệp. Webhook gửi sự kiện của workspace đã chọn, gồm cả lịch sử chưa giao; bên nhận kiểm HMAC, timestamp và chống trùng theo event ID. Quản trị viên phải kiểm đích dịch vụ, quyền dữ liệu và vòng đời bí mật trước khi bật.

## Trước vận hành

Kiểm OIDC/HTTPS, hai vai trò khác nhau, cô lập hai vùng kho, phục hồi và camera thật. CI không thay kiểm toán bảo mật toàn diện. Theo dõi upstream dependencies và image; chưa có tuyên bố tuân thủ pháp lý, HA, chống mọi kiểu tấn công hoặc tự động vá hạ tầng.
