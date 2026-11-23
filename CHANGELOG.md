# Changelog

Nhật ký thay đổi của DX-TRACE.

## [Unreleased]

### Added — workflow interchange and reusable applications

- Hỗ trợ xuất/nhập **tập con BPMN 2.0** (start, user task, cổng XOR, end, sequence flow) bằng XML; bảo toàn phân quyền, điều kiện dữ liệu, lý do phê duyệt và SLA trong thuộc tính riêng.
- API tải BPMN theo quyền, owner xem kế hoạch và áp dụng qua model store hiện có; không thêm engine thực thi workflow chạy song song.
- AppKit: manifest JSON có phiên bản để đóng gói, khám phá, lên kế hoạch và cài các ứng dụng khai báo; cung cấp manifest mẫu bảo trì và mua sắm.
- Giao diện quản trị cho xuất/nhập BPMN, kiểm kế hoạch và cài app; thêm kiểm thử HTTP app thứ hai, bảo vệ phân quyền/workspace, chống gọi lặp và dấu vết kiểm toán.
- Kiểm tra dấu hiệu lộ thông tin nhạy cảm trong mã nguồn được theo dõi bởi Git và chặn CI khi phát hiện; báo lỗi chỉ có đường dẫn/quy tắc, không in giá trị.

### Changed

- Khôi phục hệ font gốc: Google Sans cho ứng dụng/landing; Segoe UI và Arial cho giao diện Keycloak. Đồng bộ logo DX-TRACE xanh #1967D2 trên website, favicon và màn hình đăng nhập.
- So sánh mô hình theo cấu trúc thay vì thứ tự khóa JSON để tránh phát sinh phiên bản mới vô nghĩa khi nhập lại BPMN tương đương.
- Các tài liệu API, kiến trúc và nguồn mở làm rõ tính năng đã triển khai và giới hạn chưa có (full BPMN executor, plugin chạy mã ngoài, HA).

### Documentation

- Bổ sung danh mục phụ thuộc/giấy phép ở gốc, tác giả, thành phần thứ ba, lộ trình, quy tắc cộng tác và hướng dẫn demo/kiểm thử.
- Làm rõ tài liệu main so với gói v0.0.5; sửa mô tả font và minh chứng AppKit theo mã hiện tại.

- Đồng bộ tài liệu với v0.0.5: kiến trúc một giao diện/Core riêng, mô hình JSON, 11 bảng SQLite và API mở rộng.
- Bổ sung đầu mục tài liệu, quy trình backup/nâng cấp/phục hồi; sửa đường dẫn DATA_DIR khi backup trong container.
- Cập nhật danh mục phụ thuộc, hướng dẫn đóng góp, bảo mật và phân biệt ghi chú phát hành lịch sử.
- Đợt chỉnh tài liệu v0.0.5 trước đây không đổi chức năng; **các thay đổi mới ở phần trên thuộc nhánh Unreleased**, chưa là bản phát hành chính thức.

## [0.0.5] — 2026-11-22 — Extensible Core & Warehouse Operations

Xem [ghi chú phát hành và yêu cầu sao lưu trước nâng cấp](docs/releases/RELEASE_NOTES_v0.0.5.md).

- Tách mô hình và hồ sơ mở rộng khỏi JSON kho vào các bảng SQLite có chỉ mục; migration nguyên tử giữ dữ liệu cả hai vùng kho.
- Thêm phân trang, đếm kết quả theo quyền và tìm kiếm phía máy chủ; CSV ghi rõ chỉ xuất trang đang xem.
- Xếp hàng ghi theo workspace có giới hạn; giữ kiểm tra phiên bản để chặn ghi đè hồ sơ cũ.
- Thêm điều kiện chuyển bước theo dữ liệu, giới hạn trường số và ba mẫu nghiệp vụ bổ sung.
- Thêm kiểm thử migration rollback, dữ liệu vượt giới hạn JSON cũ, phạm vi trước phân trang và nhiều lượt ghi độc lập đồng thời.
- Công bố script đo HTTP trên dữ liệu tạm, kết quả trước/sau sửa xung đột và ma trận minh chứng.


- Thêm mô hình nghiệp vụ JSON: biểu mẫu sinh tự động, API, phạm vi hồ sơ, workflow theo vai trò, hạn xử lý và bộ lọc quá hạn.
- Xem kế hoạch và phát hiện xung đột trước khi áp dụng cấu hình; lưu lịch sử và cho phép áp dụng lại phiên bản tương thích.
- Chặn tự phê duyệt theo cấu hình, yêu cầu lý do và bảo vệ cập nhật đồng thời bằng phiên bản hồ sơ.
- Bổ sung sổ nhật ký lệnh nối chuỗi SHA-256, API kiểm tra chuỗi và số liệu vận hành có phân quyền.
- Webhook HTTPS có chữ ký HMAC, hàng đợi bền vững, thử lại tối đa 12 lần và mã sự kiện chống xử lý trùng ở phía nhận.
- Công cụ kiểm tra cấu hình và xác minh SQLite/checksum tệp của bản sao lưu; ví dụ nghiệp vụ bảo trì.
- Kiểm thử API phân quyền, cách ly không gian, idempotency, xung đột, khôi phục bản sao lưu và webhook.


- Thiết kế lại trang giới thiệu với hồ sơ truy xuất minh họa, quy trình vận hành và lối đăng nhập thống nhất.
- Hiển thị sẵn toàn bộ Công cụ & quản trị trong thanh điều hướng; giữ chuyển đổi Kho thực hành / Kho vận hành.
- Thêm thao tác nhanh quét mã, nhập lô và lập phiếu xuất ngay trên Tổng quan.
- Lọc lô sắp hết hạn trong 7 ngày, đã hết hạn hoặc hết tồn; tìm theo vị trí và nhà cung cấp.
- Xuất danh sách lô đang lọc thành CSV UTF-8 có bảo vệ công thức bảng tính.
- Sắp xếp lô có thể xuất theo hạn dùng gần nhất (FEFO); thống kê chỉ tính lô còn tồn khả dụng.
- Mở sẵn tra cứu sản phẩm theo mã vạch và cho phép xem toàn bộ cảnh báo.
- Bổ sung kiểm thử lọc tồn kho, thứ tự FEFO và xuất CSV.

- Khôi phục nút chuyển đổi Kho thực hành / Kho vận hành; mở lại dữ liệu của từng kho qua vùng dữ liệu hiện có, không đặt lại dữ liệu.

## [0.0.4] — 2026-11-20 — Warehouse Navigation & Scanner Fixes

### Changed
- Hợp nhất điều hướng kho; bỏ giao diện diễn tập và ứng dụng phê duyệt riêng, giữ chức năng đề xuất/phê duyệt trong kho.
- Chuyển các đường dẫn cũ về giao diện kho tương ứng; cập nhật hướng dẫn thao tác thu hồi.

### Fixed
- Cải thiện đọc QR/mã vạch bằng camera và ảnh với ZXing TRY_HARDER, ưu tiên camera sau.
- Chuẩn hóa mã lô, tiền tố DXTRACE:LOT và mã UPC/EAN/GTIN khi đối chiếu; hiển thị kết quả chưa khớp thay vì đóng trình quét.
- Cho phép chọn lại cùng một ảnh để quét; bỏ kết quả ảnh trả về sau khi đóng trình quét.
- Không mở nhầm lô khi liên kết truy xuất không tồn tại; không cho chọn lô hết tồn để lập phiếu xuất.
- Sửa cấu hình claim email OIDC và quyền đọc mã nguồn của tài khoản chạy container.

### Tests
- Bổ sung kiểm thử hồi quy cho chuẩn hóa mã quét và đối chiếu lô.
- Build và 26 kiểm thử Node.js đã đạt trên bản sửa scanner; kiểm thử camera thực tế và SSO trên VPS cần thực hiện sau triển khai.

Xem [ghi chú phát hành và hướng dẫn nâng cấp](docs/releases/RELEASE_NOTES_v0.0.4.md).

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
