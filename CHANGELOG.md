# Changelog

## Chưa phát hành

- Hợp nhất điều hướng kho; gỡ giao diện diễn tập và ứng dụng phê duyệt riêng, giữ phê duyệt trong kho.
- Chuyển các địa chỉ cũ về màn hình tương ứng; hướng dẫn thu hồi thao tác trên kho hiện tại.
- Sửa claim email OIDC và quyền đọc mã nguồn cho tài khoản chạy container.
- Không cho chọn lô đã hết tồn để lập phiếu xuất; không mở nhầm lô khác khi liên kết truy xuất không tồn tại.


Nhật ký thay đổi của DX-TRACE. Theo dõi các chức năng được đưa vào mã nguồn; **việc hoạt động ổn định trên một VPS cụ thể vẫn cần kiểm thử sau triển khai**.

## [Unreleased]

- Chưa có thay đổi mới sau v0.0.3.

## [0.0.3] — 2026-11-18 — Product Experience & Session Recovery

Bản cập nhật giao diện giới thiệu, điều hướng đến hai ứng dụng DX-OS và khả năng phục hồi phiên đăng nhập. Phần lõi, dữ liệu và triển khai self-hosted vẫn tuân theo kiến trúc ở v0.0.2.

### Added
- Trang landing thiết kế lại, bố cục responsive và mô phỏng quá trình truy xuất, thu hồi mẫu SUA-005 theo ba bước.
- Bộ nhận diện và tài liệu GitHub mới: banner dự án, ảnh xem trước landing, badge build/release, sơ đồ chức năng.
- Các lối vào công khai `/login`, `/try`, `/approvals` được Caddy điều hướng tới đúng ứng dụng và giữ nguyên đích cần mở sau đăng nhập.
- Bộ kiểm thử Node.js cho phục hồi session và Python cho định tuyến Caddy/giữ nguyên website khác; thêm CI cho `main` và pull request.

### Fixed
- Khôi phục phiên đăng nhập giữ nguyên đường dẫn, vùng dữ liệu, tham số truy xuất và hash mã lô.
- Xử lý rõ 401 khi phiên hết hạn, 403 khi thiếu quyền; API không đọc nhầm HTML trang đăng nhập thành JSON và không tự động lặp đăng nhập.
- Loại URL Keycloak và tên miền app cố định khỏi giao diện 404 / logic JavaScript công khai.
- Hướng dẫn cài Caddy kiểm tra tệp `index.html`, quyền đọc của tài khoản `caddy`, định tuyến trang gốc và quyền truy cập các tài nguyên CSS/JS.

### Upgrade notes từ v0.0.2
- Sao lưu `selfhost/.env`, dữ liệu kho/đính kèm và PostgreSQL Keycloak trước khi triển khai; không xóa Docker volumes.
- Đồng bộ mã nguồn và build lại `core`/`app`/`signin`. Trang landing public là tệp static: cập nhật riêng vào thư mục được Caddy đọc, không thể chỉ build Docker.
- Khi sử dụng Caddy trên host, áp dụng các route mới từ `selfhost/Caddyfile.ubuntu.saas.snippet` bằng công cụ dry-run/backup/validate; giữ các website không liên quan.
- Kiểm tra `/` là HTTP 200; `/login`, `/try`, `/approvals` là HTTP 302; xác minh đăng nhập thật và quay về đúng màn hình.
- Địa chỉ website demo của nhóm chỉ được nêu trong README như ví dụ trực tuyến. Mọi hướng dẫn cài đặt đều dùng tên miền riêng của người triển khai.

**So sánh:** `v0.0.2...v0.0.3`. Không thay đổi giấy phép MIT, không thêm dữ liệu sản xuất hoặc bí mật vào mã nguồn.

## [0.0.2] — 2026-11-18 — DX-OS Open-Core & SaaS Experience

Bản phát hành thứ hai tập trung vào **tách lõi DX-OS khỏi giao diện**, bổ sung **ứng dụng nghiệp vụ thứ hai dùng chung nền tảng**, và triển khai **website giới thiệu công khai cùng workspace đăng nhập qua SSO**.

### Added — Chức năng mới

- **Headless Core API riêng:** dịch vụ `core` chạy trong container độc lập, xử lý dữ liệu kho và workflow; web `app` chỉ phục vụ giao diện và chuyển tiếp API qua mã xác thực nội bộ, không gắn trực tiếp volume dữ liệu kho.
- **DX Approvals:** ứng dụng duyệt đề xuất riêng ở `/apps/approvals/index.html`, chia sẻ phiên đăng nhập OIDC, ngữ cảnh workspace và API với DX-TRACE Warehouse. Các bước hỗ trợ: nháp → gửi duyệt → duyệt/từ chối.
- **Landing page công khai:** `trace.example.org` có giới thiệu sản phẩm, mô phỏng dashboard **dữ liệu minh họa**, năng lực, kiến trúc, FAQ và liên kết đăng nhập; `app.trace.example.org` dùng cho workspace.
- **Keycloak login theme:** giao diện đăng nhập tùy biến `dxtrace` với logo, tiếng Việt cho các nhãn phổ biến, bố cục đáp ứng màn hình nhỏ và không thay đổi logic xác thực của Keycloak.
- **Triển khai Ubuntu dùng chung Caddy:** Compose override cho VPS Ubuntu sử dụng Caddy đã tồn tại, với các cổng Docker chỉ bind ở `127.0.0.1`. Thêm cấu hình ba domain và công cụ chuyển đổi Caddy có sao lưu, kiểm tra cú pháp và phục hồi nếu lỗi.
- **Công cụ quản trị SSO:** các script cục bộ để kiểm tra/thêm URI callback OAuth2 và tạo người dùng đầu tiên trong realm `warehouse` mà không in mật khẩu ra log.
- **Tài liệu và kiểm thử:** hướng dẫn kiến trúc tách Core, phân vùng tin cậy, triển khai Windows/Ubuntu, đăng nhập và kiểm thử tích hợp Core riêng.

### Changed — Thay đổi

- Luồng truy cập khi dùng kiến trúc SaaS: **Landing (public) → App (OAuth2 Proxy) → Keycloak (SSO) → Workspace**.
- Phân tách các mạng/container `core`, `app`, `signin`, `identity`, `identitydb`; PostgreSQL và dữ liệu kho không mở cổng ra Internet.
- Bổ sung thông tin giới hạn hiện có của DX-OS trong README và tài liệu triển khai.

### Fixed — Sửa lỗi

- Điều chỉnh CSS của theme đăng nhập Keycloak để tránh form đè lên vùng giới thiệu; dùng CSS phiên bản mới để giảm lỗi cache.
- Sửa script cài Caddy: xác định đúng adapter `caddyfile` khi kiểm tra file tạm và giữ quyền sở hữu/quyền đọc để dịch vụ Caddy reload được.
- Bổ sung quy trình xử lý lỗi `Invalid parameter: redirect_uri` sau khi chuyển ứng dụng sang subdomain riêng.
- Hoàn thiện kiểm thử xác thực giữa ứng dụng web và headless Core, bao gồm trường hợp workflow trống.

### Upgrade notes / Lưu ý nâng cấp từ 0.0.1

1. **Sao lưu trước:** dữ liệu kho SQLite, tệp đính kèm, PostgreSQL Keycloak và `selfhost/.env` phải được sao lưu *ngoài VPS*. Không chạy `docker compose down -v`.
2. **Không tạo lại bí mật:** giữ nguyên `selfhost/.env` và các Docker volumes hiện có. Không chạy lại `selfhost/setup.mjs` trên hệ thống đã có người dùng.
3. **SaaS subdomain:** thêm DNS `app.trace.example.org`, cho phép callback `https://app.trace.example.org/oauth2/callback` trong Keycloak client `dx-trace` thuộc realm `warehouse` **trước** khi đổi `APP_HOST`.
4. **Caddy đang phục vụ ứng dụng khác:** chọn `compose.ubuntu-edge.yaml` và [hướng dẫn chuyển đổi](selfhost/DEPLOY_SAAS_UBUNTU.md); không chạy container `gateway` chiếm cổng 80/443.
5. **Kiểm tra sau nâng cấp:** landing trả 200, OAuth2 chuyển hướng xác thực, Keycloak OIDC trả 200, các website khác vẫn hoạt động và đăng nhập bằng tài khoản `warehouse` quay về đúng workspace. Có thể cần tạo tài khoản dùng thử trước khi xác nhận đầy đủ luồng.

### Known limitations / Giới hạn

- Chưa có BPMN engine chỉnh sửa quy trình động, hệ API Gateway độc lập đầy đủ, GitOps hay Lakehouse; các chức năng DX-OS được mô tả đúng với phần hiện có.
- Bản phát hành là nguồn mở phục vụ trình diễn, thử nghiệm và phát triển tiếp; không mặc định coi là đã đánh giá bảo mật hoặc đủ tiêu chuẩn vận hành dữ liệu nhạy cảm.
- Cấu hình Keycloak và tên miền là thao tác hậu triển khai; chỉ cập nhật mã nguồn **không** tự tạo người dùng hoặc sửa OIDC client trong database đã khởi tạo.

**Phạm vi thay đổi:** xem lịch sử phát triển của repository và so sánh tag `v0.0.1` với `v0.0.2`.

## [0.0.1] — 2026-11-16 — Bản phát hành đầu tiên

DX-TRACE hỗ trợ kho thực phẩm truy xuất từng lô từ nhà cung cấp đến điểm nhận và theo dõi hàng thu hồi đến khi đối soát đủ số lượng.

- **Truy xuất và giao nhận.** Quét tem QR, tra mã vạch, lập phiếu xuất và xác định số hàng đã giao cho từng điểm nhận.
- **Giám sát và thu hồi.** Ghi nhận nhiệt độ từ đầu dò, cách ly lô, phê duyệt thu hồi và theo dõi số đã trả, số còn phải thu theo từng phiếu.
- **Kho thực hành.** Chạy trên PC bằng `npm run demo` với 16 lô, 40 phiếu giao nhận và bốn kịch bản diễn tập.
- **Triển khai trên máy chủ.** Cài bằng Docker Compose, đăng nhập qua Keycloak, phân quyền theo kho và sao lưu dữ liệu cùng tệp đính kèm.
