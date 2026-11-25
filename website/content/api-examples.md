# Ví dụ tích hợp API

Ví dụ chạy trong DevTools của ứng dụng đã đăng nhập và đã chọn Kho thực hành. Không chạy trên trang tài liệu, không đưa cookie/token vào ví dụ công khai.

## Hàm gọi JSON

```javascript
async function dx(path, body, key = crypto.randomUUID()) {
  const url = new URL('/api/' + path, location.origin);
  url.searchParams.set('area', 'training');
  const options = body === undefined ? {} : {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': key
    },
    body: JSON.stringify(body)
  };
  const response = await fetch(url, options);
  const type = response.headers.get('content-type') || '';
  const result = type.includes('application/json')
    ? await response.json() : await response.text();
  if (!response.ok) throw new Error(response.status + ' ' + JSON.stringify(result));
  return result;
}
```

## Đọc model và OpenAPI

```javascript
await dx('models/maintenance/records?limit=20&status=all');
await dx('models/maintenance/openapi');
await dx('catalog/maintenance/profile');
```

Cần cài model bảo trì trước. Nếu 404, kiểm workspace và quyền đọc.

## Tạo và gửi hồ sơ

```javascript
const body = {data: {
  equipment: 'Tủ lạnh A',
  description: 'Kiểm tra gioăng cửa',
  priority: 'Thường'
}};
const requestId = crypto.randomUUID();
const created = await dx('models/maintenance/records', body, requestId);
await dx('models/maintenance/transition', {
  id: created.id, version: created.version, target: 'submitted'
});
```

Nếu mất phản hồi ở lệnh tạo, gửi lại đúng body và requestId. Khi chuyển bước gặp 409, đọc lại phiên bản; không tự đổi version để ép ghi.

## Gói ứng dụng

Dùng manifest JSON đã đọc từ file mẫu trong repository. Owner xem kế hoạch, kiểm applicable rồi gửi bundle và baseVersions.

```javascript
// bundle là nội dung JSON của examples/bundles/operations.json
const plan = await dx('apps/bundle-plan', {bundle});
if (!plan.applicable) throw new Error('Bundle rejected');
await dx('apps/bundle-install', {bundle, baseVersions: plan.baseVersions});
```

## Kiểm tra audit

```javascript
await dx('audit-ledger/verify');
```

Chỉ owner/manager. Giữ checkpoint ngoài DB nếu muốn kiểm chứng lịch sử theo thời gian.

[API Reference](api-reference.md) · [External OIDC API](../../docs/EXTERNAL-API.md).
