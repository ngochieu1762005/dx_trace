# Bắt đầu nhanh

## Demo cục bộ

Cần Git, Node.js 24+ và pnpm 11.25.0.

```bash
git clone https://github.com/ngochieu1762005/dx_trace.git
cd dx_trace
npm install --global pnpm@11.25.0
pnpm install --frozen-lockfile
pnpm demo
```

Mở địa chỉ loopback chương trình in ra. Demo sử dụng danh tính mẫu và không chứng minh SSO production.

## Thử AppKit v2

Trong Nghiệp vụ mở rộng, mở **Gói nghiệp vụ · AppKit v2**, xem kế hoạch rồi áp dụng gói mẫu nếu hợp lệ.

```bash
node tools/dxtrace.mjs bundle-lint examples/bundles/operations.json
node tools/dxtrace.mjs bundle-plan examples/bundles/operations.json
```

## Triển khai thật

Đọc [Docker Compose](../../selfhost/README.md), [Ubuntu & Caddy](../../selfhost/DEPLOY_SAAS_UBUNTU.md) và [Gateway & SSO](../../docs/GATEWAY-AND-SSO.md). Không chạy lại setup trên máy đang vận hành.

## Kiểm thử

```bash
pnpm test
python3 -m unittest discover -s tests -p '*_test.py'
```

Xem [hướng dẫn kiểm thử](../../docs/TESTING.md).
