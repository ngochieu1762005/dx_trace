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

Script dựng và kiểm tra tài liệu hai ngôn ngữ, sao lưu thư mục tài liệu cũ rồi xuất bản vào `/srv/dx-trace/landing/docs`. Tiếp theo, script chép ảnh kho, phông chữ, CSS và JavaScript trước khi cập nhật trang giới thiệu tiếng Việt, tiếng Anh và trang 404. Máy chủ cần gói `python3-venv`. Ứng dụng kho và cổng kiểm định được cập nhật qua Docker Compose.

## GitHub Pages

Settings → Pages → GitHub Actions. Workflow Documentation tạo artifact và xuất bản khi được bật. Website VPS không phụ thuộc GitHub Pages.
