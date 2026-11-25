# Chuyển đổi Apache APISIX và Flowable OSS

**Trạng thái:** cấu hình tích hợp đang được đánh giá, chưa phát hành hoặc triển khai VPS. [English](en/third-party-core-migration.md).

## Kiến trúc mục tiêu

```mermaid
flowchart TD
  U[Trình duyệt] --> C[Caddy HTTPS]
  C --> S[OAuth2 Proxy / Keycloak]
  S --> A[Warehouse App / Quality Portal]
  A --> G[Apache APISIX]
  G --> K[DX-TRACE Headless Core]
  K --> D[(Dữ liệu nghiệp vụ)]
  K -. Tích hợp chưa hoàn tất .-> F[Flowable OSS]
  F --> P[(PostgreSQL riêng)]
```

| Thành phần | Bản mặc định hiện tại | Phương án chuyển đổi |
| --- | --- | --- |
| API Gateway | Node.js, chính sách nội bộ | APISIX standalone, khóa dịch vụ, giới hạn request |
| Workflow | Engine JavaScript, tập con BPMN | Flowable REST, BPMN thực thi, timer và tác vụ song song |
| SSO | Keycloak + OAuth2 Proxy | Giữ nguyên |
| Dữ liệu nghiệp vụ | SQLite và kho tệp | Giữ nguyên; PostgreSQL mới chỉ phục vụ Flowable |

Flowable chưa điều phối các hồ sơ kho thực tế. Quyền theo kho, chống tự duyệt, audit và tính toàn vẹn giao dịch vẫn thuộc Core. Các API công khai và sơ đồ kiến trúc hiện hành chưa thay đổi.

## Kiểm thử trên môi trường cô lập

Cần Docker Compose 2.24.4 trở lên. Tạo tệp `.env` riêng theo hướng dẫn cài đặt; thêm hai bí mật ngẫu nhiên tối thiểu 32 ký tự `DX_FLOWABLE_DB_PASSWORD` và `DX_FLOWABLE_API_PASSWORD`. Không tái sử dụng khóa Core hoặc gateway, không commit bí mật.

Tại thư mục `selfhost`:

```sh
docker compose -p dxtrace-migration -f compose.yaml -f compose.third-party.yaml --profile migration-test config --quiet
docker compose -p dxtrace-migration -f compose.yaml -f compose.third-party.yaml up -d --build core gateway-api flowable
docker compose -p dxtrace-migration -f compose.yaml -f compose.third-party.yaml --profile migration-test run --rm migration-smoke
docker compose -p dxtrace-migration -f compose.yaml -f compose.third-party.yaml down
```

Chỉ chạy trên môi trường thử nghiệm có project name riêng. Không xóa volume production. Kịch bản tạo quy trình BPMN thử, hoàn tất hai tác vụ song song, kiểm timer và lịch sử; chưa kiểm toàn bộ nghiệp vụ kho.

## Điều kiện chuyển sang vận hành

- Kiểm chứng APISIX: xác thực, nguồn header, rate limit, kích thước request/response, chuyển hướng và tương thích API.
- Ánh xạ phiên bản model, workspace, process instance và task vào Flowable; giữ kiểm quyền tại Core.
- Dùng outbox bền vững, đối soát retry không rõ kết quả, chống khởi tạo trùng và giữ audit.
- Hoàn tất hoặc di chuyển quy trình cũ đang chạy trước khi tắt timer worker; không chạy lại phê duyệt lịch sử.
- Nghiệm thu cô lập tenant, mất kết nối, khởi động lại, sao lưu/khôi phục, rollback và SSO trên VPS.
- Cập nhật SBOM, giấy phép, digest image và tài liệu phát hành trước khi chuyển mặc định.

## Nguồn và giấy phép

[Apache APISIX](https://github.com/apache/apisix) 3.21.0 và [Flowable OSS](https://github.com/flowable/flowable-engine) 7.2.0 dùng Apache-2.0. PostgreSQL 17 dùng PostgreSQL License. Tag image là cấu hình ứng viên, chưa xác minh digest và kết quả chạy.

[Cấu hình triển khai](../selfhost/compose.third-party.yaml) · [CI tích hợp](../.github/workflows/third-party-core.yml) · [Kiến trúc hiện tại](HEADLESS-CORE.md).
