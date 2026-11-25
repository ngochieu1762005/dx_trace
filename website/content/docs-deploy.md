# Xuất bản cổng tài liệu

Website tự xây dựng bằng Python, HTML/CSS/JavaScript; không dùng Docusaurus. Nguồn chính là Markdown repository.

## Build và preview

```bash
python3 -m venv .venv-docs
. .venv-docs/bin/activate
pip install -r website/requirements.txt
python website/build.py --out /tmp/dxtrace-docs-preview
python website/verify.py /tmp/dxtrace-docs-preview
python -m http.server 8000 --directory /tmp/dxtrace-docs-preview
```

Chọn thư mục output chưa tồn tại. Mở /docs/intro/. Từ phiên bản portal mới, mọi CSS, JS, ảnh, font và search index nằm trong docs/assets, không cần sửa đường dẫn sau build.

## VPS

```bash
cd /opt/dx_trace
git pull --ff-only origin main
sudo bash website/deploy-vps.sh
```

Script build, verify, sao lưu thư mục docs trước đó ngoài root web, sau đó đưa bản mới vào /srv/dx-trace/landing/docs. Không build Docker, không sửa Caddy hoặc database. Cần python3-venv trên host.

## GitHub Pages

Settings → Pages → GitHub Actions. Workflow Documentation tạo artifact và xuất bản khi được bật. Website VPS không phụ thuộc GitHub Pages.
