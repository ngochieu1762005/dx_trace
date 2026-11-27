<!-- SPDX-FileCopyrightText: 2026 DX-TRACE contributors
SPDX-License-Identifier: MIT
DX-TRACE project authors: Đặng Nhật Minh, Nguyễn Ngọc Hiếu
-->
# Phụ thuộc và thành phần tích hợp

**Thành phần trong v0.2.0:** APISIX mặc định, Flowable tùy chọn. [Apache APISIX 3.21.0](https://github.com/apache/apisix) và [Flowable OSS 7.2.0](https://github.com/flowable/flowable-engine) — Apache-2.0; PostgreSQL 17 — PostgreSQL License. Dịch vụ được lấy từ image upstream, không nhúng mã vào Core; giữ LICENSE/NOTICE và kiểm kê phụ thuộc thực tế khi phân phối. Tag chưa khóa digest; không thuộc SBOM của tag v0.0.7. [Kế hoạch chuyển đổi](docs/THIRD-PARTY-CORE-MIGRATION.md).

[README](README.md) · [Danh mục khóa đầy đủ](docs/DEPENDENCIES.md) · [Thông tin thành phần thứ ba](THIRD_PARTY_NOTICES.md)

Tài liệu mô tả các thành phần thực sự được DX-TRACE sử dụng: giao diện, Core, công cụ dựng, hạ tầng triển khai và dịch vụ ngoài. Phiên bản cài đặt lấy từ `pnpm-lock.yaml`, Dockerfile và Compose của commit đang dùng; không lấy từ badge hay phiên bản mới nhất của upstream.

## Nguyên tắc lựa chọn

- Dùng thư viện chuẩn Node.js cho HTTP, mã hóa, tệp và SQLite để giảm số phụ thuộc của Core.
- Dùng thư viện chuyên dụng cho camera, giải mã và tạo QR; quy tắc đối chiếu lô vẫn do DX-TRACE xử lý.
- Tách dịch vụ xác thực và dữ liệu danh tính khỏi dữ liệu nghiệp vụ.
- Khóa gói npm bằng lockfile; không commit `node_modules`. Một số image chỉ ghim major/tag, chưa ghim digest.
- Tích hợp ngoài có phạm vi dữ liệu được mô tả rõ; AI không phải điều kiện bắt buộc để vận hành kho.
- Giữ giấy phép, thông báo bản quyền và nguồn tài sản của bên thứ ba khi phân phối.

## Thư viện trực tiếp

Phiên bản và mã giấy phép dưới đây đối chiếu với metadata của các gói đã cài theo lockfile. Toàn văn giấy phép đi kèm từng gói là căn cứ khi phân phối.

| Thành phần | Phiên bản khóa | Giấy phép khai báo | Vai trò và lý do sử dụng |
| --- | --- | --- | --- |
| [React](https://react.dev/) | 19.2.6 | MIT | Thành phần giao diện và quản lý trạng thái màn hình |
| [React DOM](https://react.dev/) | 19.2.6 | MIT | Kết xuất giao diện trong trình duyệt |
| [Lucide React](https://lucide.dev/) | 1.31.0 | ISC | Bộ biểu tượng nhất quán cho nghiệp vụ và điều hướng |
| [ZXing Browser](https://github.com/zxing-js/browser) | 0.2.1 | MIT | Truy cập camera và đọc mã từ ảnh |
| [ZXing Library](https://github.com/zxing-js/library) | 0.23.0 | Apache-2.0 | Bộ giải mã, định dạng và tùy chọn nhận dạng |
| [qrcode](https://github.com/soldair/node-qrcode) | 1.5.4 | MIT | Sinh mã QR cho tem truy xuất |
| [Zod](https://zod.dev/) | 3.25.76 | MIT | Kiểm tra cấu trúc dữ liệu đầu vào API |
| [Vite](https://vite.dev/) | 8.0.13 | MIT | Biên dịch và đóng gói giao diện; phụ thuộc lúc dựng |

Có **7 dependencies và 1 devDependency**. [Danh mục 126 cặp tên–phiên bản](docs/DEPENDENCIES.md) bao gồm cả gói gián tiếp và binary tùy chọn theo OS/CPU. Số gói cài trên một máy có thể thấp hơn. Danh mục này không thay thế SBOM hay kết quả quét lỗ hổng.

## Runtime, triển khai và công cụ

| Thành phần | Cấu hình hiện có | Phạm vi |
| --- | --- | --- |
| [Node.js](https://github.com/nodejs/node) | Node 24; image `node:24-bookworm-slim` | Core/API, runtime SQLite, build; bản vá image có thể thay đổi |
| [pnpm](https://github.com/pnpm/pnpm) | 11.25.0 | Cài thư viện theo lockfile |
| [Python](https://github.com/python/cpython) | Python 3 | Script triển khai và test routing; thư viện chuẩn, không phải backend kho |
| [Keycloak](https://github.com/keycloak/keycloak) | 26.4.7 | Identity/SSO qua OIDC |
| [PostgreSQL](https://github.com/postgres/postgres) | `17-alpine` | Database của Keycloak, không lưu lô hàng |
| [OAuth2 Proxy](https://github.com/oauth2-proxy/oauth2-proxy) | v7.12.0 | Phiên đăng nhập và chuyển danh tính đến app |
| [Caddy](https://github.com/caddyserver/caddy) | `2-alpine` hoặc Caddy trên host | HTTPS và định tuyến |
| [Docker Compose](https://github.com/docker/compose) | v2 | Điều phối dịch vụ, mạng riêng và volume |
| GitHub Actions | `actions/checkout@v4`, `actions/setup-node@v4` | Kiểm nguồn, build, test, container; không chạy trong sản phẩm |

SQLite được dùng qua `node:sqlite`, không cài driver npm hoặc ORM Drizzle. Thư mục `drizzle/` chứa migration SQL; tên thư mục không có nghĩa là dự án đang dùng Drizzle ORM. Các thành phần thượng nguồn và image có giấy phép riêng, xem kho chính thức liên kết trong bảng; giấy phép MIT của DX-TRACE không thay thế các điều khoản đó.

## Dịch vụ ngoài và dữ liệu trao đổi

| Dịch vụ | Bắt buộc? | Dữ liệu gửi | Hành vi khi không dùng |
| --- | --- | --- | --- |
| Open Food Facts | Chỉ khi tra sản phẩm | Mã sản phẩm | Nhập thông tin lô thủ công; giữ nguồn/ODbL trong kết quả API |
| Groq | Không | Câu hỏi, thống kê, cảnh báo và SOP liên quan | Trợ lý dùng trả lời cục bộ; không có mô hình LLM tự host mặc định |
| Scanner HTTP | Chỉ để cho tải tệp đã kiểm dịch | Nội dung tệp và token của dịch vụ | Tệp ở trạng thái cách ly; không coi là đã quét sạch |
| Webhook HTTPS | Không | Sự kiện kiểm toán của workspace được cấu hình | Không giao sự kiện ra ngoài |

Groq là dịch vụ API ngoài, không phải thư viện hoặc mô hình nguồn mở được đóng gói trong repository. Compose mặc định chưa chuyển `AI_API_KEY` vào Core; chỉ ghi biến vào `.env` chưa đủ. Cấu hình theo [OPERATIONS](selfhost/OPERATIONS.md).

## Tài sản phân phối kèm

Google Sans WOFF2 được lưu trong repository và dùng cho app/landing, kèm [giấy phép font](public/fonts/google-sans/LICENSE.txt). Theme Keycloak dùng font hệ thống Segoe UI/Arial. Biểu trưng công nghệ có [danh mục nguồn](docs/assets/LOGOS.md). Dữ liệu thực hành là dữ liệu mô phỏng; không phải dữ liệu của khách hàng đã triển khai.

## Cập nhật và kiểm chứng

```bash
npx --yes pnpm@11.25.0 install --frozen-lockfile
npm run audit:secrets
npm run build
npm test
python3 -m unittest discover -s tests -p '*_test.py'
```

Khi thêm/nâng gói: ghi mục đích, cập nhật package và lockfile cùng nhau, đọc giấy phép của phiên bản chọn, kiểm thử phần bị ảnh hưởng và cập nhật hai danh mục phụ thuộc. Khi đổi image, kiểm cả container và hướng dẫn migration/rollback. CI trên nhánh sau v0.0.6 có pipeline tạo **SPDX SBOM từ dependency đã cài** và kiểm định định dạng, bên cạnh kiểm dấu hiệu bí mật. Xem [quy trình supply chain](docs/SUPPLY-CHAIN.md). Chưa có kiểm toán tương thích giấy phép toàn bộ thư viện, CVE đầy đủ hoặc SBOM cho từng container.

CLI AppKit dùng yaml 2.8.2 (ISC) để đọc manifest của extension. [Bảng đối chiếu giấy phép](docs/dependency-licenses.md).
