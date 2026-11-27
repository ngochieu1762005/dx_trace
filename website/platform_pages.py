# SPDX-License-Identifier: MIT
"""Publish the platform entry points beside the existing bilingual handbook."""
import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPO = "https://github.com/ngochieu1762005/dx_trace"

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
        def docs(path, title):
            return link(doc+path+"/", title)
        titles = {"platform":tr("Nền tảng","Platform"),"developers":tr("Lập trình viên","Developers"),
                  "applications":tr("Ứng dụng","Applications"),"evidence":tr("Kiểm chứng bằng chứng","Evidence verifier"),
                  "benchmarks":tr("Kết quả đo","Benchmarks"),"olp":"OLP PMNM 2026"}
        table = "".join(f'<tr><td>{r["concurrency"]}</td><td>{r["requests_per_second"]}</td><td>{r["p95_ms"]}</td><td>{r["errors"]}</td></tr>' for r in report["results"])
        content = {
            "platform": "<h2>Identity &amp; Access</h2><p>Keycloak · OAuth2 · APISIX · RBAC</p>"+docs("architecture-map",tr("Sơ đồ kiến trúc","Architecture map"))+
                "<h2>Workflow &amp; Evidence</h2><p>"+tr("Flowable điều phối xét duyệt thu hồi. AppKit thực thi quy tắc của mô hình và ghi bằng chứng khi chuyển trạng thái.","Flowable coordinates recall reviews. AppKit executes model rules and captures evidence at the transition.")+"</p>"+docs("business-decision-proof","Business Decision Proof"),
            "developers": "<h2>Quickstart</h2><pre><code>dxtrace app init maintenance\ndxtrace app validate ./maintenance\ndxtrace app install ./maintenance</code></pre><h2>OAuth2 · SDK · OpenAPI</h2><p>"+tr("Đăng ký client, workspace và model. Dùng access token để đọc schema và tạo hồ sơ.","Register a client, workspace and model. Use its access token to read a schema and create a record.")+"</p><pre><code>GET /v2/models/{model}/schema</code></pre>"+docs("external-api-v2","External API v2 · SDK"),
            "applications": "<h2>Trace Portal</h2>"+docs("warehouse-guide",tr("Từ nhập kho tới thu hồi","From receiving to recall"))+"<h2>Quality Portal</h2>"+docs("recall-guide",tr("Kiểm định và xét duyệt cách ly","Inspection and quarantine review"))+"<h2>Maintenance App</h2>"+link(REPO+"/tree/main/examples/maintenance",tr("Manifest, schema và BPMN bảo trì","Maintenance manifest, schemas and BPMN")),
            "benchmarks": "<p>"+tr("Ngày 22/11/2026 · 10.000 hồ sơ ban đầu · SQLite và HTTP loopback · 5 giây mỗi mức tải. Phép đo này chưa bao gồm HTTPS, SSO và Gateway trên VPS.","22 November 2026 · 10,000 initial records · SQLite over HTTP loopback · 5 seconds per load level. VPS HTTPS, SSO and gateway latency are outside this measurement.")+'</p><table><thead><tr><th>'+tr("Đồng thời","Concurrency")+'</th><th>req/s</th><th>p95 (ms)</th><th>'+tr("Lỗi","Errors")+'</th></tr></thead><tbody>'+table+"</tbody></table>"+link(REPO+"/blob/main/docs/benchmarks/platform-after-queue.json",tr("Dữ liệu đo gốc","Measurement data"))+" · "+docs("benchmark",tr("Phương pháp đo","Method")),
            "olp":"<h2>PoF</h2><p>"+tr("Đối chiếu sáu tiêu chí với tag, checksum, log cài ngoài source, SBOM và lịch sử đóng góp.","Trace six criteria to a release tag, checksums, clean-install log, SBOM and project history.")+"</p>"+link(REPO+"/blob/main/docs/olp-compliance.md",tr("Bảng đối chiếu từng tiêu chí","Criteria and repository evidence"))+" · "+link(REPO+"/releases","Releases")+" · "+docs("acceptance",tr("Biên bản nghiệm thu","Acceptance")),
            "evidence":"<p>"+tr("Chọn gói .tar.gz và khóa công khai đã nhận độc lập. Trình duyệt kiểm tra chữ ký manifest và SHA-256 của sáu tệp ngay trên máy bạn. CLI kiểm tra thêm chuỗi sự kiện và thực thi lại chính sách AppKit.","Select the archive and an independently trusted public key. Your browser checks the manifest signature and all six file hashes locally. The CLI also checks the event chain and replays the AppKit policy.")+'</p><form id="verify-proof"><label>'+tr("Gói bằng chứng","Evidence archive")+' <input name="archive" type="file" required accept=".gz,.tgz"></label><label>'+tr("Khóa công khai","Trusted public key")+' <input name="publicKey" type="file" required accept=".pem"></label><button class="button">'+tr("Kiểm tra","Verify")+'</button> <output id="verification" aria-live="polite"></output></form><script defer src="/assets/evidence-check.js"></script>'+docs("business-decision-proof",tr("Tạo gói mẫu và kiểm chứng offline","Generate a sample and verify offline"))
        }
        for route, title in titles.items():
            dest=out/base.strip("/")/route
            dest.mkdir(parents=True,exist_ok=True)
            alternate=("/" if en else "/en/")+route+"/"
            nav="".join(link(base+k+"/",v) for k,v in titles.items() if k!=route)
            page=f'''<!doctype html><html lang="{language}"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{title} · DX-TRACE</title><link rel="stylesheet" href="/assets/site.css?v=12"><header class="masthead"><div class="wrap masthead-inner"><a class="brand" href="{base}"><img width="154" height="32" src="/assets/brand-lockup.svg" alt="DX-TRACE"></a><a href="{alternate}">{tr("English","Tiếng Việt")}</a></div></header><main class="wrap product-page"><h1>{title}</h1>{content[route]}<nav>{nav}</nav></main></html>'''
            (dest/"index.html").write_text(page, encoding="utf-8")
