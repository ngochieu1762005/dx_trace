<!-- SPDX-FileCopyrightText: 2026 DX-TRACE contributors
SPDX-License-Identifier: MIT
DX-TRACE project authors: Đặng Nhật Minh, Nguyễn Ngọc Hiếu
-->
# Declarative application kit (v1)

## Package SDK và CLI cho lập trình viên

Một gói có `app.yaml`, các file JSON ở `schemas/` và BPMN ở `workflows/`. Dùng `import {loadPackage} from './tools/app-cli.mjs'` để đọc gói và `compilePackage(input)` từ `lib/app-package.mjs` để kiểm tra offline. API install/upgrade nhận cùng object `{manifest,files}`; Core tự kiểm lại. [Gói mẫu](../examples/maintenance/app.yaml) · [Bảy lệnh CLI](demo-guide.md)

- `metadata.name` gồm 1–16 chữ thường và chữ số, bắt đầu bằng chữ. Dùng phiên bản số major.minor.patch; `spec.requiresCore` nhận khoảng đóng–mở như `>=0.0.7 <1.0.0`.
- Mỗi schema dùng định dạng record model của DX-TRACE gồm name, fields, permissions. Tên file là resource ID. Mỗi BPMN cùng tên khai báo quy trình của resource đó. Các định nghĩa đã kiểm được cài vào workflow engine model. [Tập con BPMN](BPMN.md)
- Quyền được đặt trong phạm vi gói. Read cho phép đọc theo role và scope của schema; create cho phép tạo/sửa theo role; approve kích hoạt các transition theo role, điều kiện, người tạo và phiên bản hồ sơ. Create và approve bao hàm quyền xem cần thiết. Endpoint dữ liệu dùng ID `pkg_<app>_<resource>`.
- Mỗi app có một route `/<name>`. Core đăng ký theo workspace. Frontend tra cứu route qua APISIX, sau đó APISIX chuyển yêu cầu UI sang mạng portal. `model-portal` dùng trình hiển thị chung; `<name>-portal` dùng service riêng do operator đặt trên mạng Compose `portals`, trả HTML từ `GET /` ở cổng 8094. Mã HTML phải tuân theo CSP cùng origin. Gói bảo trì dùng một service độc lập và script form chung. Cài manifest cho các service đã provision không cần sửa cấu hình gateway hoặc khởi động lại Core. Chế độ loopback dùng renderer có sẵn.
- API owner: GET /api/packages, GET /api/packages/{name}/status, POST /api/packages/{name}/{install,upgrade,rollback,uninstall}. Gửi revision từ status. Trạng thái chưa từng cài có revision 0. Sau lỗi mất kết nối đọc status trước khi thử lại. Snapshot, quyền, route và ledger cùng được commit. Phạm vi schema ổn định suốt vòng đời; thay đổi không tương thích dữ liệu hoặc workflow đang chạy bị từ chối. Gỡ app giữ dữ liệu và quyền sở hữu schema, sau đó cài lại để truy cập.
- Chạy CLI trực tiếp bằng `node tools/dxtrace.mjs app …` hoặc dùng `dxtrace` trong bin của bản cài. Công cụ lint/catalog/openapi và các API DeclarativeApplication, ApplicationBundle hiện hữu tiếp tục hoạt động.



DX-TRACE supports **versioned, declarative applications** that reuse the
existing authenticated Core API, forms, record store, roles and workflow
runtime. A manifest carries validated business schema and policy; installing
it **does not execute third-party JavaScript, shell commands or external URLs**.

This proves that another use case can be installed by configuration rather
than editing the warehouse source code. It is not yet a general-purpose
plugin store or a trusted installer for arbitrary external binaries.

## Package

A manifest uses:

```json
{
  "apiVersion": "dxtrace.io/v1",
  "kind": "DeclarativeApplication",
  "metadata": {
    "id": "maintenance",
    "name": "Yêu cầu bảo trì thiết bị",
    "version": "1.0.0",
    "description": "Independent maintenance workflow"
  },
  "spec": {
    "model": {
      "id": "maintenance",
      "name": "Yêu cầu bảo trì thiết bị",
      "fields": [],
      "permissions": {},
      "workflow": {}
    }
  }
}
```

The inner `model` above is illustrative: copy a complete working schema
from [maintenance](../examples/maintenance/app.json) or
[purchase](../examples/purchase/app.json). Each model must pass the
server-side `validateModel` checks; arbitrary fields/scripts are rejected.
A manifest may optionally declare `metadata.uiPath` if its UI is separately deployed at **exactly** `/apps/{metadata.id}/`. Remote URLs, query strings, script hooks and arbitrary path overrides are rejected. The path advertises an existing trusted same-origin service; it does not upload or execute a UI bundle. See the [Quality Control Portal](QUALITY-PORTAL.md) example. The model validator also enforces this path rule for direct model updates, rather than trusting the manifest API alone.

Only the owner can plan and install a new application. The model version is
tracked separately from the application semantic version.

## API

| Method | Path | Permission |
| --- | --- | --- |
| GET | `/api/apps` | Authenticated, lists applications readable by caller |
| GET | `/api/apps/{id}/manifest` | Reader of the model |
| POST | `/api/apps/plan` | Workspace owner, dry-run only |
| POST | `/api/apps/install` | Workspace owner, Idempotency-Key required |
| GET | `/api/platform` | Authenticated, discovers installed models |

POST `/api/apps/plan`:

```json
{
  "manifest": {
    "apiVersion": "dxtrace.io/v1",
    "kind": "DeclarativeApplication",
    "metadata": {
      "id": "maintenance",
      "name": "Yêu cầu bảo trì thiết bị",
      "version": "1.0.0"
    },
    "spec": {"model": {"...": "complete model definition"}}
  }
}
```

The response contains `baseVersion`, `nextVersion`,
`unchanged`, `records` and `rejections`.
Only call `install` with an approved plan and the matching
`baseVersion`. The existing transaction engine checks optimistic locking,
workspace isolation, schema migration and active-record workflow changes,
then writes an audit-ledger entry. A replayed idempotency key returns the
original outcome rather than creating duplicate commands.

Read and write APIs use the session of an authenticated OIDC user. Never
embed `DX_CORE_TOKEN`, service passwords, or device keys in application
manifests, demos or source files.

## Human / Process / Data / Intelligence mapping

- **H:** inherited Identity/SSO, workspace membership, read/create roles;
- **P:** declarative transitions, actor separation, approval reasons, SLA;
- **D:** shared transactional model store, pagination, audit and backups;
- **I:** integrations and assistant capabilities remain optional; the
  application kit does not claim a generic AI-agent runtime.

## Reproducible evidence

```sh
node --test tests/appkit.test.mjs tests/platform.test.mjs
node --test tests/platform-api.test.mjs
```

The tests verify independent models, denied executable manifest fields,
versioned installation plans, role boundaries and persisted model discovery.

## Current limitations

The kit supports **one declarative model per application manifest**. It can
render forms/workflows in the common operations console, or link to a
**separately deployed, same-origin UI service**, such as Quality Control Portal.
It does not ingest arbitrary UI bundles from manifests or support executable
plugins, dependency resolution, signatures, or third-party code sandboxes.
Do not describe these as implemented until the corresponding code and
acceptance tests exist.

### Bằng chứng và bàn giao trong manifest

Gói Maintenance 1.1.0 dùng Core 0.2.0 trở lên. Với workspace đã cài 1.0.0, chạy `dxtrace app upgrade maintenance ./examples/maintenance` bằng phiên owner của vùng cần nâng cấp. CLI giữ hồ sơ hiện có và kiểm tra tương thích trước khi áp dụng.

```yaml
evidence:
  signing: required
  resources: [maintenance]
handover:
  provider: flowable
  resource: maintenance
  after: done
```

Đặt hai khối trong `spec`. Quy tắc ký áp dụng cho từng chuyển bước của tài nguyên được chọn. Sau bước cuối, người tạo hồ sơ khởi động bàn giao từ Maintenance Portal. Flowable lưu instance, task, người duyệt và kết quả. [Quy tắc xác minh và bàn giao](BUSINESS-DECISION-PROOF.md)
