# Danh mục phiên bản khóa — DX-TRACE

[Lý do lựa chọn, giấy phép và dịch vụ ngoài](../DEPENDENCIES.md). Bảng dưới đối chiếu lockfile hiện tại; không bổ sung gói chỉ vì tính năng được nhắc trong tài liệu.

Nguồn chuẩn: [package.json](../package.json), [pnpm-lock.yaml](../pnpm-lock.yaml), [Compose](../selfhost/compose.yaml) và [Dockerfile](../selfhost/Dockerfile). Không dùng số version trong tài liệu để thay lockfile khi cài đặt.

## Gói trực tiếp

| Gói | Version khóa | Vai trò |
| --- | --- | --- |
| React / React DOM | 19.2.6 | Giao diện |
| Lucide React | 1.31.0 | Biểu tượng |
| @zxing/browser | 0.2.1 | Đọc camera/ảnh |
| @zxing/library | 0.23.0 | Bộ giải mã và cấu hình |
| qrcode | 1.5.4 | Sinh tem |
| Zod | 3.25.76 | Kiểm đầu vào |
| Vite | 8.0.13 | Build frontend (devDependency) |

Tổng **7 dependencies + 1 devDependency**, tức 8 gói trực tiếp khi tính React và React DOM riêng. Lockfile chứa **126 cặp tên–phiên bản**, bao gồm binary tùy chọn cho nhiều OS/CPU; số gói cài trên một máy có thể khác.

## Runtime và dịch vụ

- Node.js 24: HTTP, fetch, crypto, filesystem, AsyncLocalStorage và SQLite tích hợp; không cài ORM Drizzle dù thư mục SQL tên `drizzle/`.
- pnpm 11.25.0 quản lý gói; Python 3 dùng thư viện chuẩn cho script triển khai và kiểm thử routing.
- Container: Node 24 bookworm-slim, Keycloak 26.4.7, PostgreSQL 17-alpine, OAuth2 Proxy v7.12.0, Caddy 2-alpine, Apache APISIX 3.21.0 (mặc định), Flowable REST 7.2.0 và PostgreSQL 17 (overlay tùy chọn). Một số tag image là tag biến động, chưa khóa digest.
- Open Food Facts, Groq, scanner ngoài và webhook là kết nối HTTP, không phải npm packages. Groq/scanner/webhook tùy chọn theo cấu hình.
- Phông gốc được khôi phục: giao diện nghiệp vụ và landing sử dụng **Google Sans** từ các tệp WOFF2 đã có trong repository (xem [giấy phép](../public/fonts/google-sans/LICENSE.txt)); Keycloak dùng stack **Segoe UI/Arial**. Trình duyệt dùng font dự phòng khi cần. Không tải font từ Google Fonts trong các stylesheet giao diện.

Cài bằng `npx --yes pnpm@11.25.0 install --frozen-lockfile`. Danh mục dưới không phải SBOM hoặc báo cáo kiểm toán lỗ hổng. Khi nâng version, cập nhật lockfile và kiểm build/tests; không suy ra an toàn chỉ từ việc không đổi phụ thuộc.

## Toàn bộ gói trong lockfile

| Gói | Phiên bản khóa | Quan hệ | OS / CPU theo lockfile |
| --- | --- | --- | --- |
| `@emnapi/core` | 1.10.0 | Gián tiếp | — |
| `@emnapi/runtime` | 1.10.0 | Gián tiếp | — |
| `@emnapi/wasi-threads` | 1.2.1 | Gián tiếp | — |
| `@esbuild/aix-ppc64` | 0.28.0 | Gián tiếp | aix, ppc64 |
| `@esbuild/android-arm64` | 0.28.0 | Gián tiếp | android, arm64 |
| `@esbuild/android-arm` | 0.28.0 | Gián tiếp | android, arm |
| `@esbuild/android-x64` | 0.28.0 | Gián tiếp | android, x64 |
| `@esbuild/darwin-arm64` | 0.28.0 | Gián tiếp | darwin, arm64 |
| `@esbuild/darwin-x64` | 0.28.0 | Gián tiếp | darwin, x64 |
| `@esbuild/freebsd-arm64` | 0.28.0 | Gián tiếp | freebsd, arm64 |
| `@esbuild/freebsd-x64` | 0.28.0 | Gián tiếp | freebsd, x64 |
| `@esbuild/linux-arm64` | 0.28.0 | Gián tiếp | linux, arm64 |
| `@esbuild/linux-arm` | 0.28.0 | Gián tiếp | linux, arm |
| `@esbuild/linux-ia32` | 0.28.0 | Gián tiếp | linux, ia32 |
| `@esbuild/linux-loong64` | 0.28.0 | Gián tiếp | linux, loong64 |
| `@esbuild/linux-mips64el` | 0.28.0 | Gián tiếp | linux, mips64el |
| `@esbuild/linux-ppc64` | 0.28.0 | Gián tiếp | linux, ppc64 |
| `@esbuild/linux-riscv64` | 0.28.0 | Gián tiếp | linux, riscv64 |
| `@esbuild/linux-s390x` | 0.28.0 | Gián tiếp | linux, s390x |
| `@esbuild/linux-x64` | 0.28.0 | Gián tiếp | linux, x64 |
| `@esbuild/netbsd-arm64` | 0.28.0 | Gián tiếp | netbsd, arm64 |
| `@esbuild/netbsd-x64` | 0.28.0 | Gián tiếp | netbsd, x64 |
| `@esbuild/openbsd-arm64` | 0.28.0 | Gián tiếp | openbsd, arm64 |
| `@esbuild/openbsd-x64` | 0.28.0 | Gián tiếp | openbsd, x64 |
| `@esbuild/openharmony-arm64` | 0.28.0 | Gián tiếp | openharmony, arm64 |
| `@esbuild/sunos-x64` | 0.28.0 | Gián tiếp | sunos, x64 |
| `@esbuild/win32-arm64` | 0.28.0 | Gián tiếp | win32, arm64 |
| `@esbuild/win32-ia32` | 0.28.0 | Gián tiếp | win32, ia32 |
| `@esbuild/win32-x64` | 0.28.0 | Gián tiếp | win32, x64 |
| `@jridgewell/gen-mapping` | 0.3.13 | Gián tiếp | — |
| `@jridgewell/resolve-uri` | 3.1.2 | Gián tiếp | — |
| `@jridgewell/source-map` | 0.3.11 | Gián tiếp | — |
| `@jridgewell/sourcemap-codec` | 1.5.5 | Gián tiếp | — |
| `@jridgewell/trace-mapping` | 0.3.31 | Gián tiếp | — |
| `@napi-rs/wasm-runtime` | 1.1.4 | Gián tiếp | — |
| `@oxc-project/types` | 0.130.0 | Gián tiếp | — |
| `@rolldown/binding-android-arm64` | 1.0.1 | Gián tiếp | android, arm64 |
| `@rolldown/binding-darwin-arm64` | 1.0.1 | Gián tiếp | darwin, arm64 |
| `@rolldown/binding-darwin-x64` | 1.0.1 | Gián tiếp | darwin, x64 |
| `@rolldown/binding-freebsd-x64` | 1.0.1 | Gián tiếp | freebsd, x64 |
| `@rolldown/binding-linux-arm-gnueabihf` | 1.0.1 | Gián tiếp | linux, arm |
| `@rolldown/binding-linux-arm64-gnu` | 1.0.1 | Gián tiếp | linux, arm64 |
| `@rolldown/binding-linux-arm64-musl` | 1.0.1 | Gián tiếp | linux, arm64 |
| `@rolldown/binding-linux-ppc64-gnu` | 1.0.1 | Gián tiếp | linux, ppc64 |
| `@rolldown/binding-linux-s390x-gnu` | 1.0.1 | Gián tiếp | linux, s390x |
| `@rolldown/binding-linux-x64-gnu` | 1.0.1 | Gián tiếp | linux, x64 |
| `@rolldown/binding-linux-x64-musl` | 1.0.1 | Gián tiếp | linux, x64 |
| `@rolldown/binding-openharmony-arm64` | 1.0.1 | Gián tiếp | openharmony, arm64 |
| `@rolldown/binding-wasm32-wasi` | 1.0.1 | Gián tiếp | wasm32 |
| `@rolldown/binding-win32-arm64-msvc` | 1.0.1 | Gián tiếp | win32, arm64 |
| `@rolldown/binding-win32-x64-msvc` | 1.0.1 | Gián tiếp | win32, x64 |
| `@rolldown/pluginutils` | 1.0.1 | Gián tiếp | — |
| `@tybys/wasm-util` | 0.10.2 | Gián tiếp | — |
| `@types/node` | 22.19.19 | Gián tiếp | — |
| `@zxing/browser` | 0.2.1 | Trực tiếp | — |
| `@zxing/library` | 0.23.0 | Trực tiếp | — |
| `@zxing/text-encoding` | 0.9.0 | Gián tiếp | — |
| `acorn` | 8.16.0 | Gián tiếp | — |
| `ansi-regex` | 5.0.1 | Gián tiếp | — |
| `ansi-styles` | 4.3.0 | Gián tiếp | — |
| `buffer-from` | 1.1.2 | Gián tiếp | — |
| `camelcase` | 5.3.1 | Gián tiếp | — |
| `cliui` | 6.0.0 | Gián tiếp | — |
| `color-convert` | 2.0.1 | Gián tiếp | — |
| `color-name` | 1.1.4 | Gián tiếp | — |
| `commander` | 2.20.3 | Gián tiếp | — |
| `decamelize` | 1.2.0 | Gián tiếp | — |
| `detect-libc` | 2.1.2 | Gián tiếp | — |
| `dijkstrajs` | 1.0.3 | Gián tiếp | — |
| `emoji-regex` | 8.0.0 | Gián tiếp | — |
| `esbuild` | 0.28.0 | Gián tiếp | — |
| `fdir` | 6.5.0 | Gián tiếp | — |
| `find-up` | 4.1.0 | Gián tiếp | — |
| `fsevents` | 2.3.3 | Gián tiếp | darwin |
| `get-caller-file` | 2.0.5 | Gián tiếp | — |
| `is-fullwidth-code-point` | 3.0.0 | Gián tiếp | — |
| `jiti` | 2.7.0 | Gián tiếp | — |
| `lightningcss-android-arm64` | 1.32.0 | Gián tiếp | android, arm64 |
| `lightningcss-darwin-arm64` | 1.32.0 | Gián tiếp | darwin, arm64 |
| `lightningcss-darwin-x64` | 1.32.0 | Gián tiếp | darwin, x64 |
| `lightningcss-freebsd-x64` | 1.32.0 | Gián tiếp | freebsd, x64 |
| `lightningcss-linux-arm-gnueabihf` | 1.32.0 | Gián tiếp | linux, arm |
| `lightningcss-linux-arm64-gnu` | 1.32.0 | Gián tiếp | linux, arm64 |
| `lightningcss-linux-arm64-musl` | 1.32.0 | Gián tiếp | linux, arm64 |
| `lightningcss-linux-x64-gnu` | 1.32.0 | Gián tiếp | linux, x64 |
| `lightningcss-linux-x64-musl` | 1.32.0 | Gián tiếp | linux, x64 |
| `lightningcss-win32-arm64-msvc` | 1.32.0 | Gián tiếp | win32, arm64 |
| `lightningcss-win32-x64-msvc` | 1.32.0 | Gián tiếp | win32, x64 |
| `lightningcss` | 1.32.0 | Gián tiếp | — |
| `locate-path` | 5.0.0 | Gián tiếp | — |
| `lucide-react` | 1.31.0 | Trực tiếp | — |
| `nanoid` | 3.3.18 | Gián tiếp | — |
| `p-limit` | 2.3.0 | Gián tiếp | — |
| `p-locate` | 4.1.0 | Gián tiếp | — |
| `p-try` | 2.2.0 | Gián tiếp | — |
| `path-exists` | 4.0.0 | Gián tiếp | — |
| `picocolors` | 1.1.1 | Gián tiếp | — |
| `picomatch` | 4.0.4 | Gián tiếp | — |
| `pngjs` | 5.0.0 | Gián tiếp | — |
| `postcss` | 8.5.23 | Gián tiếp | — |
| `qrcode` | 1.5.4 | Trực tiếp | — |
| `react-dom` | 19.2.6 | Trực tiếp | — |
| `react` | 19.2.6 | Trực tiếp | — |
| `require-directory` | 2.1.1 | Gián tiếp | — |
| `require-main-filename` | 2.0.0 | Gián tiếp | — |
| `rolldown` | 1.0.1 | Gián tiếp | — |
| `scheduler` | 0.27.0 | Gián tiếp | — |
| `set-blocking` | 2.0.0 | Gián tiếp | — |
| `source-map-js` | 1.2.1 | Gián tiếp | — |
| `source-map-support` | 0.5.21 | Gián tiếp | — |
| `source-map` | 0.6.1 | Gián tiếp | — |
| `string-width` | 4.2.3 | Gián tiếp | — |
| `strip-ansi` | 6.0.1 | Gián tiếp | — |
| `terser` | 5.47.1 | Gián tiếp | — |
| `tinyglobby` | 0.2.16 | Gián tiếp | — |
| `ts-custom-error` | 3.3.1 | Gián tiếp | — |
| `tslib` | 2.8.1 | Gián tiếp | — |
| `tsx` | 4.22.1 | Gián tiếp | — |
| `undici-types` | 6.21.0 | Gián tiếp | — |
| `vite` | 8.0.13 | Build trực tiếp | — |
| `which-module` | 2.0.1 | Gián tiếp | — |
| `wrap-ansi` | 6.2.0 | Gián tiếp | — |
| `y18n` | 4.0.3 | Gián tiếp | — |
| `yargs-parser` | 18.1.3 | Gián tiếp | — |
| `yargs` | 15.4.1 | Gián tiếp | — |
| `zod` | 3.25.76 | Trực tiếp | — |
