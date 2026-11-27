# SPDX-FileCopyrightText: 2026 DX-TRACE contributors
# SPDX-License-Identifier: MIT
# DX-TRACE project authors: Đặng Nhật Minh, Nguyễn Ngọc Hiếu
# SPDX-License-Identifier: MIT
"""Publish the platform entry points beside the existing bilingual handbook."""
import json
import shutil
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPO = "https://github.com/ngochieu1762005/dx_trace"

TAG = "v0.2.0"
COMMIT = "00990ecd272648cbb6da808ab30a83d48ec163cd"
DOWNLOAD = f"{REPO}/releases/download/{TAG}"
SOURCE = f"{REPO}/blob/{COMMIT}"


def publish(out):
    shutil.copytree(ROOT/"landing", out, dirs_exist_ok=True)
    report = json.loads((ROOT/"docs/benchmarks/platform-after-queue.json").read_text())
    for en in (False, True):
        language = "en" if en else "vi"
        base = "/en/" if en else "/"
        doc = "/docs/en/" if en else "/docs/"
        def tr(vi, english):
            return english if en else vi
        def link(path, title):
            return f'<a class="underlink" href="{path}">{title}</a>'
        def heading(vi, english):
            return f"<h2>{tr(vi, english)}</h2>"
        def docs(path, title):
            return link(doc+path+"/", title)
        titles = {"platform":tr("Nền tảng","Platform"),"developers":tr("Lập trình viên","Developers"),
                  "applications":tr("Ứng dụng","Applications"),"evidence":tr("Kiểm tra chữ ký","Evidence verifier"),
                  "benchmarks":tr("Kết quả đo","Benchmarks"),"olp":tr("OLP PMNM 2026", "Open Source Olympiad 2026")}
        table = "".join(f'<tr><td>{r["concurrency"]}</td><td>{r["requests_per_second"]}</td><td>{r["p95_ms"]}</td><td>{r["errors"]}</td></tr>' for r in report["results"])
        content = {
            "platform": heading("Danh tính và phân quyền", "Identity &amp; Access")+"<p>Keycloak · OAuth2 · APISIX · RBAC</p>"+docs("architecture-map",tr("Sơ đồ kiến trúc","Architecture map"))+
                '<h2 id="data">'+tr("Nền tảng dữ liệu", "Data platform")+'</h2><p>'+tr("Khai báo cấu trúc dữ liệu, tạo hồ sơ và phân quyền theo mô hình, không gian làm việc và người tạo.","Declare schemas, create records and scope access by model, workspace and creator.")+"</p>"+docs("platform",tr("Mô hình dữ liệu","Data models"))+
                heading("Quy trình và bằng chứng", "Workflow and evidence")+"<p>"+tr("Flowable điều phối xét duyệt thu hồi. AppKit thực thi quy tắc của mô hình và ghi bằng chứng khi chuyển trạng thái.","Flowable coordinates recall reviews. AppKit executes model rules and captures evidence at the transition.")+"</p>"+docs("business-decision-proof",tr("Kiểm chứng quyết định nghiệp vụ","Business Decision Proof")),
            "developers": (
                heading("Cài ứng dụng bảo trì bằng CLI", "Install Maintenance with the CLI")
                + "<p>" + tr("Trên Linux, chuẩn bị Node.js 24 và pnpm 11.25.0. Tải và giải nén bản ứng viên rồi làm theo hướng dẫn cài CLI dưới đây.", "On Linux, install Node.js 24 and pnpm 11.25.0. Download and extract the candidate source, then follow the CLI installation guide.") + "</p>"
                + link(DOWNLOAD+f"/DX-TRACE-{TAG}.tar.gz", tr("Tải mã nguồn", "Download source"))
                + " · " + link(SOURCE+"/docs/build-from-source.md", tr("Cài CLI và khởi động kho cục bộ", "Install the CLI and start the local warehouse (Vietnamese guide)"))
                + "<p>" + tr("Giữ máy chủ cục bộ chạy ở cổng 8080. Trong terminal thứ hai, mở một thư mục làm việc trống rồi chạy:", "Keep the local server running on port 8080. Open a second terminal in an empty working directory and run:") + "</p>"
                + '<pre><code>export PATH="$HOME/dxtrace-install/bin:$PATH"\ndxtrace app init maintenance\ndxtrace app validate ./maintenance\ndxtrace app install ./maintenance\ndxtrace app list</code></pre>'
                + "<p>" + tr("Danh sách phải có maintenance phiên bản 1.0.0. Mở", "The list should include maintenance version 1.0.0. Open") + " <code>http://127.0.0.1:8080/maintenance</code>.</p>"
                + heading("Đọc hồ sơ bằng SDK", "Read records with the SDK")
                + "<p>" + tr("Trong dự án JavaScript riêng, cài SDK bằng lệnh sau. Để chạy ví dụ, dùng một hệ thống đã bật API tích hợp, cấp quyền đọc mô hình bảo trì và cung cấp mã truy cập OAuth2 ngắn hạn.", "In a separate JavaScript project, install the SDK as shown below. The example requires an enabled external API, permission to read the Maintenance model and a short-lived OAuth2 access token.") + "</p>"
                + f"<pre><code>npm install {DOWNLOAD}/dxtrace-sdk-0.2.0.tgz</code></pre>"
                + "<pre><code>import { DXTraceClient } from '@dxtrace/sdk';\nconst dx = new DXTraceClient({\n  baseUrl: process.env.DXTRACE_API_ORIGIN,\n  accessToken: () => process.env.DXTRACE_ACCESS_TOKEN\n});\nconst page = await dx.records.list('pkg_maintenance_maintenance', { limit: 5 });\nconsole.log(page.records.map(record => record.id));</code></pre>"
                + docs("external-api-v2",tr("Cấu hình quyền và API tích hợp", "Configure scopes and the external API"))
            ),
            "applications": heading("Cổng truy xuất", "Trace Portal")+docs("warehouse-guide",tr("Từ nhập kho tới thu hồi","From receiving to recall"))+heading("Cổng kiểm định", "Quality Portal")+docs("recall-guide",tr("Kiểm định và xét duyệt cách ly","Inspection and quarantine review"))+heading("Ứng dụng bảo trì", "Maintenance App")+link(REPO+"/tree/main/examples/maintenance",tr("Gói khai báo, cấu trúc dữ liệu và quy trình BPMN","Maintenance manifest, schemas and BPMN")),
            "benchmarks": "<p>"+tr("Ngày 22/11/2026 · 10.000 hồ sơ ban đầu · SQLite và HTTP loopback · 5 giây mỗi mức tải. Phép đo này chưa bao gồm HTTPS, SSO và Gateway trên VPS.","22 November 2026 · 10,000 initial records · SQLite over HTTP loopback · 5 seconds per load level. VPS HTTPS, SSO and gateway latency are outside this measurement.")+'</p><table><thead><tr><th>'+tr("Đồng thời","Concurrency")+'</th><th>req/s</th><th>p95 (ms)</th><th>'+tr("Lỗi","Errors")+'</th></tr></thead><tbody>'+table+"</tbody></table>"+link(REPO+"/blob/main/docs/benchmarks/platform-after-queue.json",tr("Dữ liệu đo gốc","Measurement data"))+" · "+docs("benchmark",tr("Phương pháp đo","Method")),
            "olp": ("<p>"+tr("Đặng Nhật Minh và Nguyễn Ngọc Hiếu cùng phát triển DX-TRACE. Cả hai là sinh viên ngành Khoa học dữ liệu tại Trường Đại học Khoa học và Công nghệ Hà Nội (USTH).","Đặng Nhật Minh and Nguyễn Ngọc Hiếu developed DX-TRACE together. Both study Data Science at the University of Science and Technology of Hanoi (USTH).")+ "</p>"
                + heading("Bản ứng viên v0.2.0", "Release candidate v0.2.0")
                + "<p>" + tr("Phát hành ngày 27/11/2026. Đội chưa chốt phiên bản nộp thi.", "Released on 27 November 2026. The final submission version has yet to be selected.") + " · <code>" + COMMIT[:8] + "</code></p>"
                + link(DOWNLOAD+f"/DX-TRACE-{TAG}.tar.gz",tr("Tải bản ứng viên","Download candidate source")) + " · "
                + link(REPO+"/actions/runs/45970856284",tr("Xem CI đúng phiên bản","View CI for this commit")) + " · "
                + link(DOWNLOAD+"/clean-install.log",tr("Nhật ký cài ngoài thư mục nguồn","Clean installation log"))
                + "<p>" + link(DOWNLOAD+"/SHA256SUMS",tr("Đối chiếu mã kiểm tra SHA-256","Check SHA-256 sums")) + " · "
                + link(SOURCE+"/docs/olp-compliance.md",tr("Đối chiếu sáu tiêu chí PoF","Six PoF criteria")) + " · "
                + docs("acceptance",tr("Nghiệm thu theo môi trường","Deployment acceptance")) + "</p>"
                + link(base+"evidence/",tr("Kiểm tra gói bằng chứng mẫu","Verify the sample evidence"))),
            "evidence": (heading("Thử trên hồ sơ mô phỏng", "Try a simulated record")
                + "<p>" + tr("Gói mẫu và khóa minh họa lấy từ bản v0.2.0. Kiểm tra mẫu gốc, sau đó thay đổi trạng thái quyết định trong bộ nhớ để xem bước kiểm tra nào thất bại.", "The sample and demonstration key come from v0.2.0. Verify the original, then change the decision status in memory to see which check fails.") + "</p>"
                + '<div class="hero-actions"><button type="button" id="sample-check" class="button">'+tr("Kiểm tra gói mẫu", "Verify sample")+'</button><button type="button" id="sample-change" class="sample-secondary" disabled>'+tr("Kiểm tra bản mẫu đã sửa", "Verify modified sample")+'</button></div><p><output id="sample-result" aria-live="polite"></output></p>'
                + heading("Kiểm tra gói của bạn", "Verify your own archive") + "<p>"+tr("Chọn gói .tar.gz và khóa công khai đã nhận độc lập. Trình duyệt kiểm tra chữ ký bản kê và SHA-256 của sáu tệp ngay trên máy bạn. CLI kiểm tra thêm chuỗi sự kiện và thực thi lại chính sách AppKit.","Select the archive and an independently trusted public key. Your browser checks the manifest signature and all six file hashes locally. The CLI also checks the event chain and replays the AppKit policy.")+'</p><form id="verify-proof"><label>'+tr("Gói bằng chứng","Evidence archive")+' <input name="archive" type="file" required accept=".gz,.tgz"></label><label>'+tr("Khóa công khai","Trusted public key")+' <input name="publicKey" type="file" required accept=".pem"></label><button class="button">'+tr("Kiểm tra","Verify")+'</button> <output id="verification" aria-live="polite"></output></form><script defer src="/assets/evidence-check.js?v=2"></script>'+docs("business-decision-proof",tr("Tạo gói mẫu và kiểm chứng ngoại tuyến","Generate a sample and verify offline")))
        }
        for route, title in titles.items():
            dest=out/base.strip("/")/route
            dest.mkdir(parents=True,exist_ok=True)
            alternate=("/" if en else "/en/")+route+"/"
            nav="".join(link(base+k+"/",v) for k,v in titles.items() if k!=route)
            page=f'''<!doctype html><html lang="{language}"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{title} · DX-TRACE</title><link rel="stylesheet" href="/assets/site.css?v=14"><header class="masthead"><div class="wrap masthead-inner"><a class="brand" href="{base}"><img width="154" height="32" src="/assets/brand-lockup.svg" alt="DX-TRACE"></a><a href="{alternate}">{tr("English","Tiếng Việt")}</a></div></header><main class="wrap product-page"><header class="product-heading"><a href="{base}">{tr("Trang chủ","Home")}</a><h1>{title}</h1></header>{content[route]}<nav>{nav}</nav></main></html>'''
            (dest/"index.html").write_text(page, encoding="utf-8")

    write_sitemap(out, titles)


def write_sitemap(out, product_routes):
    origin = "https://dxtrace.hieuds.com"
    pairs = [("/", "/en/"), ("/docs/", "/docs/en/")]
    pairs.extend((f"/{route}/", f"/en/{route}/") for route in product_routes)
    for entry in json.loads((out/"docs/assets/search.json").read_text()):
        route = entry["path"].removesuffix("index.html")
        pairs.append(("/docs/"+route, "/docs/en/"+route))

    ET.register_namespace("xhtml", "http://www.w3.org/1999/xhtml")
    root = ET.Element("urlset", xmlns="http://www.sitemaps.org/schemas/sitemap/0.9")
    for vi, en in pairs:
        for path in (vi, en):
            url = ET.SubElement(root, "url")
            ET.SubElement(url, "loc").text = origin + path
            for lang, target in (("vi", vi), ("en", en)):
                ET.SubElement(url, "{http://www.w3.org/1999/xhtml}link",
                              rel="alternate", hreflang=lang, href=origin+target)
    ET.indent(root)
    ET.ElementTree(root).write(out/"sitemap.xml", encoding="utf-8", xml_declaration=True)
