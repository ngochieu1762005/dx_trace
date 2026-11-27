# SDK JavaScript cho DX-TRACE

**Tiếng Việt** · [English](README.en.md)

Gói `@dxtrace/sdk` cung cấp thư viện JavaScript và khai báo kiểu TypeScript cho ứng dụng gọi API phiên bản 2. Cần Node.js 20 trở lên cho ứng dụng khách. Để chạy toàn bộ DX-TRACE từ mã nguồn, dùng Node.js 24.

## Cài gói vào dự án riêng

Tải `dxtrace-sdk-0.2.0.tgz` từ [bản phát hành v0.2.0](https://github.com/ngochieu1762005/dx_trace/releases/tag/v0.2.0). Từ thư mục của ứng dụng khách, chạy:

```sh
npm install /duong-dan/den/dxtrace-sdk-0.2.0.tgz
node --input-type=module -e "import {DXTraceClient} from '@dxtrace/sdk'; console.log(DXTraceClient.name)"
```

Kết quả mong đợi là `DXTraceClient`. Để cài ứng dụng bảo trì vào một kho, dùng [AppKit CLI](https://dxtrace.hieuds.com/docs/appkit/). SDK dùng mô hình đã được cài.

## Đọc hồ sơ

Quản trị viên bật dịch vụ API tích hợp, đăng ký ứng dụng khách trên Keycloak và cấp quyền đọc mô hình trong một kho. Chạy ví dụ sau trong tệp `.mjs` của ứng dụng khách với địa chỉ dịch vụ và mã truy cập ngắn hạn trong biến môi trường:

```js
import {DXTraceClient} from '@dxtrace/sdk';

const dx = new DXTraceClient({
  baseUrl: process.env.DXTRACE_API_ORIGIN,
  accessToken: () => process.env.DXTRACE_ACCESS_TOKEN
});
const model = 'pkg_maintenance_maintenance';
const page = await dx.records.list(model, {limit: 5});
console.log(page.records.map(record => record.id));
```

## Tạo phiếu và gửi duyệt

Ví dụ tiếp nối phiên đọc ở trên. Ứng dụng khách cần quyền tạo hồ sơ và chuyển bước ở cả Keycloak lẫn chính sách dịch vụ. Trong vùng thử nghiệm, lưu mã yêu cầu để có thể gửi lại cùng thao tác khi mất kết nối.

```js
const ticket = await dx.records.create(model, {
  equipment: 'Bơm tuần hoàn',
  description: 'Kiểm tra phớt trục',
  priority: 'Thường'
}, 'maintenance-demo-001-create');

await dx.workflow.transition(model, ticket.id, {
  version: ticket.version,
  target: 'submitted'
}, 'maintenance-demo-001-submit');
```

Một yêu cầu mới cần một mã mới. Khi gửi lại cùng thao tác, giữ nguyên mã và nội dung. Nếu gặp HTTP 403, đối chiếu vai trò người dùng, mô hình và phạm vi đã cấp. Ứng dụng khách chịu trách nhiệm đăng nhập và làm mới mã truy cập. [Hợp đồng API và các quyền](https://dxtrace.hieuds.com/docs/external-api-v2/)
