# Build và cài từ source archive

Cần Linux với Bash, GNU tar/coreutils, curl, Node.js 24 và pnpm 11.25.0. Tại thư mục chứa các tệp tải từ cùng một release, kiểm SHA256SUMS rồi giải nén tar.gz. Với bản có AppKit lifecycle, từ thư mục vừa giải nén chạy:

```sh
bash scripts/clean-install.sh "$HOME/dxtrace-install"
export PATH="$HOME/dxtrace-install/bin:$PATH"
mkdir -p "$HOME/dxtrace-work"
cd "$HOME/dxtrace-work"
export PUBLIC_ORIGIN=http://127.0.0.1:8080 PORT=8080 BIND_ADDRESS=127.0.0.1 DX_LOCAL_DEMO=1
export DATA_DIR="$PWD/data"
node "$HOME/dxtrace-install/selfhost/server.mjs"
```

Bản cài chứa web đã build, Core, CLI và các thư viện runtime cần thiết. Cấu hình thư mục và môi trường bằng tham số và biến môi trường. Để kiểm đầy đủ trên máy có cổng loopback 8080 trống, chạy `bash scripts/verify-release.sh /đường/dẫn/DX-TRACE-vX.Y.Z.tar.gz`. Script tạo bản cài riêng, xóa thư mục nguồn tạm, khởi động từ một thư mục khác rồi kiểm tra HTTP và bảy lệnh CLI.

[Dockerfile](../selfhost/Dockerfile) · [Cài VPS](../selfhost/DEPLOY_SAAS_UBUNTU.md)
