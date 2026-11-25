# Kiến trúc hệ thống DX-TRACE

**Trạng thái main (chưa phát hành):** Apache APISIX 3.21.0 là gateway mặc định trong Compose. Overlay Flowable OSS 7.2.0 thực thi quy trình thẩm định độc lập; nghiệp vụ kho và AppKit hiện hữu vẫn dùng runtime cũ. CI tích hợp PR #35 đã đạt; nghiệm thu VPS chưa xác nhận. [Tích hợp](../../docs/THIRD-PARTY-CORE-MIGRATION.md).

![Sơ đồ triển khai DX-TRACE với các tuyến người dùng, đầu dò và tích hợp](../../docs/assets/architecture-current.svg)

Sơ đồ mô tả mã nguồn trên nhánh `main`. Cấu hình Docker chuẩn chạy Caddy trong Compose. Với VPS dùng Caddy trên máy chủ, tệp ghi đè Compose chuyển các điểm vào cần thiết sang cổng loopback. [Compose chuẩn](../../selfhost/compose.yaml) · [Cấu hình Ubuntu](../../selfhost/compose.ubuntu-edge.yaml) · [Ví dụ Caddy](../../selfhost/Caddyfile.ubuntu.saas.snippet)

## Ứng dụng và điểm vào

| Điểm vào | Dịch vụ xử lý | Dữ liệu hoặc quyền |
| --- | --- | --- |
| Trang giới thiệu và `/docs/` | Caddy trên máy chủ phục vụ HTML, CSS và JavaScript đã dựng | Nội dung công khai. Liên kết `/login` chuyển trình duyệt sang tên miền kho để bắt đầu xác thực. |
| Giao diện kho | `signin → app:8080` | Tài khoản Keycloak. Giao diện kho gồm lô hàng, giao nhận, truy xuất, sự cố, đề xuất và nghiệp vụ mở rộng. |
| `/apps/quality/` | `signin → app → quality-portal:8090` | App lấy tệp tĩnh từ container kiểm định. JavaScript trong trình duyệt gọi `/api` trên cùng tên miền kho bằng phiên hiện tại. |
| Tên miền danh tính | `Caddy → identity:8080` | Keycloak cung cấp OpenID Connect qua miền `warehouse`. |
| `POST /api/ingest` | `Caddy → app → gateway-api → core` | Bearer của thiết bị. Core đối chiếu khóa và ghi số đo vào kho tương ứng. |
| API tích hợp tùy chọn | Tuyến HTTPS riêng → `external-api:8093 → gateway-api → core` | JWT Keycloak, chính sách client và phạm vi mô hình được phép đọc. Cần bật profile và đặt tuyến riêng. |

## Yêu cầu từ trình duyệt đi qua đâu

1. Người dùng vào kho qua Caddy. OAuth2 Proxy thực hiện đăng nhập OIDC với Keycloak, quản lý cookie phiên và truyền danh tính đến App.
2. App phục vụ giao diện React. Khi trình duyệt gọi `/api`, App đính kèm khóa dịch vụ ứng dụng và chuyển yêu cầu đến `gateway-api:8082`. Đối với trang kiểm định, container riêng chỉ phục vụ tệp giao diện.
3. Apache APISIX áp dụng giới hạn lưu lượng, phương thức, kích thước và chính sách header rồi chuyển tiếp với khóa Core riêng. App và Gateway nối `appnet`. Gateway và Core nối `privcore`.
4. Core kiểm quyền theo kho, vai trò và thao tác. Các thao tác phù hợp được kiểm tra phiên bản và khóa chống gửi trùng trước khi ghi giao dịch. Phân quyền nghiệp vụ nằm tại Core.

| Cổng loopback trên VPS Ubuntu | Đích trong Compose | Tuyến |
| --- | --- | --- |
| `127.0.0.1:8180` | `signin:4180` | Giao diện kho, kiểm định và API theo phiên |
| `127.0.0.1:8181` | `identity:8080` | Tên miền danh tính |
| `127.0.0.1:8182` | `app:8080` | Tuyến nhận số đo qua Caddy |
| `127.0.0.1:8183` | `external-api:8093` | Chỉ khi bật API tích hợp tùy chọn |

Core và cổng API nội bộ dùng cổng container 8081 và 8082. Chúng không có cổng công bố lên host trong cấu hình chuẩn. [Mã App](../../selfhost/server.mjs) · [Cấu hình APISIX](../../selfhost/apisix/apisix.yaml) · [Mã Core](../../selfhost/core-server.mjs)

## Dữ liệu được lưu ở đâu

| Kho lưu | Chủ sở hữu | Dữ liệu |
| --- | --- | --- |
| PostgreSQL, volume `identitydata` | Keycloak qua mạng `dbnet` | Người dùng, cấu hình miền và dữ liệu danh tính |
| SQLite WAL, `warehouse.sqlite` | Core, volume `warehouse` | Kho, thành viên, lô, giao nhận, sự cố, hồ sơ quy trình, số đo, nhật ký và bộ nhớ đệm mã vạch |
| `objects/<workspace>/<sha256>` | Core, cùng volume `warehouse` | Nội dung tệp. Thông tin tệp và trạng thái kiểm dịch được quản lý theo kho. |

Nghiệp vụ kho gốc dùng trạng thái JSON trong `workspaces`. AppKit lưu mô hình, hồ sơ và kết quả lệnh trong các bảng riêng. Kho vận hành và kho thực hành là các phạm vi dữ liệu được Core phân giải khi nhận yêu cầu. Khi sao lưu, giữ cả dữ liệu Core và định danh Keycloak. [Khởi tạo dữ liệu](../../selfhost/runtime.mjs) · [Sao lưu và phục hồi](backup-restore.md)

## Quy trình và dịch vụ nền

Overlay tùy chọn kết nối Core với Flowable qua `coreworkflow`; PostgreSQL riêng (`workflowdata`) qua `workflowdb`. Không mở cổng engine. Kho lạnh là bản xuất gzip JSON Lines theo workspace/tháng, kiểm SHA-256, không xóa nguồn. [Flowable](../../docs/NATIVE-REVIEW.md) · [Quản trị DX-OS](../../docs/DXOS-GOVERNANCE.md).

- Nghiệp vụ kho kiểm tra lô, hạn dùng, giữ hàng, giao nhận và thu hồi. Khi quản lý cách ly từ phiếu kiểm định không đạt, Core liên kết phiếu với sự cố và áp dụng chặn giao theo quy tắc của lô.
- AppKit dùng manifest để khai báo biểu mẫu, phạm vi đọc, chuyển trạng thái và quyền. Bộ thực thi có tác vụ song song và định thời lưu trong hồ sơ. Worker định thời chạy cùng tiến trình Core. Nhập/xuất BPMN áp dụng trên tập con đã mô tả.
- Chuỗi nhật ký có thể xuất để xác minh độc lập với mốc đối chiếu giữ riêng. Worker webhook được bật bằng cấu hình và gửi sự kiện có chữ ký HMAC.

[Quy trình kho](../../docs/OPERATING-WORKFLOWS.md) · [Bộ thực thi](../../docs/PROCESS-RUNTIME.md) · [BPMN](../../docs/BPMN.md) · [Nhật ký](../../docs/AUDIT-EVIDENCE.md)

## Quét mã và tích hợp ngoài

| Tích hợp | Tuyến | Dữ liệu qua ranh giới |
| --- | --- | --- |
| Camera và QR | Trình duyệt giải mã, đối chiếu hồ sơ kho | Mã đọc được. Dùng mã lô để phân biệt các lô của cùng sản phẩm. |
| Open Food Facts | `GET /api/barcode/{mã} → Core → Open Food Facts` | Gửi mã sản phẩm khi bộ nhớ đệm hết hạn hoặc thiếu dữ liệu. Kết quả có thể gồm tên, nhãn hiệu và quy cách. |
| Kiểm dịch tệp tùy chọn | `Core → scan-api → ClamAV` | Gửi nội dung tệp để quét. Tệp cần có kết quả sạch mới tải xuống được. |
| Trợ lý Groq tùy chọn | `POST /api/assistant → Core → Groq` | Khi Core có khóa, gửi câu hỏi, số liệu, cảnh báo và trích đoạn tài liệu phù hợp. Khi chạy mặc định, trợ lý truy tìm tài liệu trong kho. |
| Webhook tùy chọn | Worker Core → đích HTTPS đã cấu hình | Sự kiện nhật ký có chữ ký. Bên nhận đối chiếu chữ ký và chống xử lý lặp. |

[Danh mục API](../../docs/API.md) · [API tích hợp OIDC](../../docs/EXTERNAL-API.md) · [Compose quét tệp](../../selfhost/compose.scanner.yaml)

## Kiểm chứng phạm vi triển khai

| Cấu hình | Cách kiểm tra |
| --- | --- |
| Chạy thử cục bộ | Chạy `npm run demo` để kiểm giao diện và dữ liệu thực hành qua máy chủ loopback, với danh tính mẫu. |
| Docker Compose | Dùng CI container để kiểm đường đi qua App, Gateway, Core và dịch vụ kiểm định. |
| VPS dùng tài khoản thật | Kiểm tra hai phiên đăng nhập, quyền thao tác khác nhau và khả năng khôi phục dữ liệu theo bảng nghiệm thu. |
| Chuyển dữ liệu sang PostgreSQL | Dùng công cụ xuất và kiểm thử nhập ngoại tuyến. Runtime nghiệp vụ mặc định vẫn là SQLite. |

[Bản đồ mã nguồn](../../docs/CODEBASE.md) · [Bảng nghiệm thu](../../docs/ACCEPTANCE-2026.md) · [Thử chuyển dữ liệu PostgreSQL](../../docs/POSTGRES-MIGRATION.md)
