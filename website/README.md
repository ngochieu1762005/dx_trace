<!-- SPDX-FileCopyrightText: 2026 DX-TRACE contributors
SPDX-License-Identifier: MIT
DX-TRACE project authors: Đặng Nhật Minh, Nguyễn Ngọc Hiếu
-->
# Website và cổng tài liệu DX-TRACE

Trang chủ tiếng Việt nằm ở `/`, bản tiếng Anh ở `/en/`. Cổng tài liệu dùng `/docs/` và `/docs/en/`. Chọn ngôn ngữ trên một trang tài liệu để mở cùng chủ đề trong ngôn ngữ kia.

## Dựng và xem trên máy

Từ thư mục gốc của bản sao Git, dùng Python 3, tạo môi trường riêng rồi dựng vào một thư mục **chưa tồn tại**. Quá trình dựng đọc mã commit từ Git để liên kết trang với phiên bản nguồn.

```bash
python3 -m venv .venv-docs
. .venv-docs/bin/activate
python -m pip install -r website/requirements.txt
preview=$(mktemp -d)
python website/build.py --out "$preview/site"
python website/verify.py "$preview/site"
python -m http.server 8000 --bind 127.0.0.1 --directory "$preview/site"
```

Mở `http://127.0.0.1:8000/` để xem trang chủ, hoặc thêm `docs/en/` để đọc tài liệu tiếng Anh. Tìm một thuật ngữ, mở một kết quả và chuyển ngôn ngữ ở chính trang đó để kiểm tra cả chỉ mục lẫn điều hướng.

## Sửa nội dung ở đâu?

| Phần hiển thị | Nguồn |
| --- | --- |
| Trang chủ, điều hướng, minh họa đối soát | [Trang tiếng Việt](../landing/index.html), [trang tiếng Anh](../landing/en/index.html) |
| Trang nền tảng, ứng dụng, lập trình viên, hiệu năng và OLP | [platform_pages.py](platform_pages.py) |
| Chương tài liệu và thứ tự trong mục lục | [navigation.json](navigation.json), [navigation.en.json](navigation.en.json) |
| Bản đọc tiếng Việt của một đặc tả kỹ thuật | Tệp `content/<mã-trang>.vi.md` dùng cùng mã trang, kèm liên kết đến tài liệu gốc |
| Ô tìm kiếm, bộ lọc, phản hồi của nút | [Mã giao diện tài liệu](static/site.js) |

Quy trình Documentation trên GitHub dựng lại website và cung cấp gói `dxtrace-docs-preview` cho từng pull request. [Quy trình xuất bản](content/docs-deploy.md) mô tả riêng bước đưa bản đã kiểm tra lên máy chủ.
