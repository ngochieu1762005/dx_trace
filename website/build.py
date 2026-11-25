# SPDX-License-Identifier: MIT
# Copyright (c) 2026 DX-TRACE contributors
"""Static DX-TRACE documentation site; no frontend framework required."""
import argparse
import html
import json
import posixpath
import shutil
import subprocess
import unicodedata
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit, quote, unquote
from markdown_it import MarkdownIt

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "website"
REPO = "https://github.com/ngochieu1762005/dx_trace"
MD = MarkdownIt("commonmark", {"html": False}).enable(["table", "strikethrough"])
E = html.escape

def slug(text):
    text = unicodedata.normalize("NFC", text.lower())
    return "".join(c for c in text if c.isalnum() or c in " _-").replace(" ", "-") or "section"

def render(source, current, routes, revision):
    tokens = MD.parse((ROOT / source).read_text(encoding="utf-8"))
    headings, used, words = [], {}, []
    sections = []
    section = None
    def rewrite(value, image):
        url = urlsplit(value)
        if url.scheme or url.netloc or not url.path:
            return value
        target = posixpath.normpath(posixpath.join(posixpath.dirname(source), unquote(url.path)))
        if target.startswith("../") or target.startswith("/"):
            return value
        if target in routes:
            path = "../" + routes[target] + "/index.html"
        elif target.startswith("docs/assets/") and (ROOT / target).is_file():
            path = "../assets/docs/" + quote(posixpath.basename(target))
        elif image:
            path = "https://raw.githubusercontent.com/ngochieu1762005/dx_trace/" + revision + "/" + quote(target,safe="/")
        else:
            path = REPO + ("/tree/" if (ROOT / target).is_dir() else "/blob/") + revision + "/" + quote(target,safe="/")
        if path.startswith("https://"):
            dest = urlsplit(path)
            return urlunsplit((dest.scheme,dest.netloc,dest.path,url.query,url.fragment))
        return urlunsplit(("","",path,url.query,url.fragment))
    def visit(token):
        if token.type in ("text","code_inline","fence","code_block"):
            words.append(token.content)
            if section is not None:
                section["text"].append(token.content)
        for attr, image in (("href",False),("src",True)):
            value = token.attrGet(attr)
            if value is not None:
                token.attrSet(attr, rewrite(value,image))
        for child in token.children or []:
            visit(child)
    for i, token in enumerate(tokens):
        if token.type == "heading_open":
            title = "".join(c.content for c in tokens[i+1].children or [] if c.type in ("text","code_inline"))
            base = slug(title)
            count = used.get(base,0)
            used[base] = count+1
            anchor = base if not count else base+"-"+str(count)
            token.attrSet("id",anchor)
            if token.tag in ("h2","h3"):
                headings.append((token.tag,title,anchor))
                section = {"heading":title,"anchor":anchor,"text":[]}
                sections.append(section)
        visit(token)
    return MD.renderer.render(tokens,MD.options,{}),headings," ".join(words),sections

def build(out):
    groups = json.loads((SITE/"navigation.json").read_text(encoding="utf-8"))
    for source in sorted((ROOT/"docs/releases").glob("RELEASE_NOTES_*.md"),reverse=True):
        version = source.stem.removeprefix("RELEASE_NOTES_")
        groups[-1][1].append(["release-"+version,source.relative_to(ROOT).as_posix(),version])
    entries = [item for _,items in groups for item in items]
    routes = {source:key for key,source,_ in entries}
    routes["docs/README.md"] = "intro"
    if len({key for key,_,_ in entries}) != len(entries):
        raise ValueError("Duplicate route")
    revision = subprocess.check_output(["git","rev-parse","HEAD"],cwd=ROOT,text=True).strip()
    out.mkdir(parents=True,exist_ok=False)
    docs = out/"docs"
    docs.mkdir()
    assets = docs/"assets"
    assets.mkdir()
    for name in ("site.css","site.js"):
        shutil.copy2(SITE/"static"/name,assets/name)
    shutil.copy2(ROOT/"public/brand-mark.svg",assets/"brand.svg")
    shutil.copytree(ROOT/"docs/assets",assets/"docs")
    shutil.copytree(ROOT/"public/fonts/google-sans",assets/"fonts")
    search = []
    section_index = []
    def link(key):
        return "../"+key+"/index.html"
    for i,(key,source,title) in enumerate(entries):
        body,headings,plain,sections = render(source,key,routes,revision)
        section = next(group for group,items in groups if any(x[0]==key for x in items))
        sidebar = "".join('<details class="nav-group"'+(' open' if group==section else '')+'><summary>'+E(group)+"</summary>"+
            "".join('<a href="'+E(link(k))+'"'+(' aria-current="page"' if k==key else '')+">"+E(t)+"</a>" for k,_,t in items)+"</details>" for group,items in groups)
        toc = "".join('<a class="'+tag+'" href="#'+E(anchor)+'">'+E(t)+"</a>" for tag,t,anchor in headings)
        paging = ""
        for offset,label in ((-1,"← Trang trước"),(1,"Trang sau →")):
            if 0<=i+offset<len(entries):
                k,_,t=entries[i+offset]
                paging+='<a href="'+E(link(k))+'"><small>'+label+"</small><strong>"+E(t)+"</strong></a>"
        cards = ""
        if key=="intro":
            cards='<div class="start"><div class="eyebrow">OPEN-CORE · DEVELOPER PORTAL</div><p class="lead">Xây dựng ứng dụng nghiệp vụ.<br>Truy xuất đến cùng.</p><p>Một nền tảng. Nhiều ứng dụng. Chung dữ liệu và danh tính.</p><div class="actions"><a class="primary" href="../quickstart/index.html">Bắt đầu ngay →</a><a href="../architecture/index.html">Khám phá kiến trúc</a></div></div><div class="cards">'+''.join('<a href="'+link(k)+'"><span class="card-icon">'+icon+'</span><strong>'+label+'</strong><span>'+desc+'</span></a>' for k,icon,label,desc in [('quickstart','↗','Bắt đầu nhanh','Chạy demo và cài ứng dụng'),('warehouse-guide','▤','Hướng dẫn người dùng','Kho, truy xuất và thu hồi'),('app-tutorial','◇','Xây dựng ứng dụng','Tutorial và AppKit'),('api-reference','⌘','API Reference','Hợp đồng HTTP và ví dụ'),('deployment-checklist','↗','Triển khai','Docker, bảo mật và vận hành'),('evaluation','✓','Kiểm chứng','Ma trận và kịch bản nghiệm thu')])+'</div>'
        api_filter = '<div class="api-tools"><label for="api-filter">Tìm endpoint</label><input id="api-filter" type="search" placeholder="Ví dụ: bundle, /models, GET…"><span id="api-count" aria-live="polite"></span></div>' if key=="api-reference" else ""
        page = f"""<!doctype html>
<html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="description" content="{E(title)} · Tài liệu kỹ thuật DX-TRACE">
<title>{E(title)} | DX-TRACE Docs</title>
<link rel="icon" type="image/svg+xml" href="../assets/brand.svg"><link rel="stylesheet" href="../assets/site.css"><script defer src="../assets/site.js"></script></head>
<body data-root="../"><a class="skip" href="#content">Bỏ qua điều hướng</a>
<header class="topbar"><button class="menu" id="menu" type="button" aria-label="Menu tài liệu" aria-controls="sidebar" aria-expanded="false">☰</button>
<a class="brand" href="../intro/index.html"><img src="../assets/brand.svg" width="36" height="36" alt=""><strong>DX-TRACE</strong><span>Docs</span></a>
<nav class="toplinks"><a href="../intro/index.html">Tài liệu</a><a href="../api-reference/index.html">API</a><a href="https://dxtrace.hieuds.com/">Sản phẩm</a></nav>
<div class="top-actions"><button id="search-open" class="search-trigger" type="button">⌕ <span>Tìm tài liệu</span> <kbd>Ctrl K</kbd></button><button id="theme" type="button" aria-label="Đổi giao diện sáng tối">◐</button><a class="github" href="{REPO}">GitHub ↗</a></div></header>
<div class="layout"><aside id="sidebar" class="sidebar" aria-label="Mục lục tài liệu"><div class="version"><span class="dot"></span> MAIN <code>{revision[:7]}</code></div><label class="sidebar-label" for="nav-filter">Danh mục tài liệu</label><input id="nav-filter" type="search" placeholder="Lọc danh mục…" autocomplete="off">{sidebar}</aside>
<main id="content" class="main"><div class="breadcrumb">Tài liệu <span>›</span> {E(section)} <span>›</span> {E(title)}</div>{cards}{api_filter}<article>{body}</article><div class="page-feedback"><strong>Tài liệu này có hữu ích?</strong><a href="{REPO}/issues/new">Gửi góp ý hoặc báo lỗi ↗</a></div>
<div class="source"><a href="{REPO}/blob/{revision}/{quote(source,safe='/')}">Xem nguồn tài liệu ↗</a><span>MIT · {revision[:7]}</span></div><nav class="pagination" aria-label="Trang liền kề">{paging}</nav></main>
<aside class="toc" aria-label="Mục lục trang"><strong>Trong trang này</strong>{toc or '<span>Giới thiệu</span>'}<div class="toc-bottom"><button type="button" id="print-page">In / lưu PDF</button><a href="{REPO}/issues">Góp ý tài liệu ↗</a></div></aside></div>
<footer><span>DX-TRACE · Open-Core Digital Transformation Platform</span><a href="{REPO}/releases">Releases</a><a href="{REPO}/issues">Issues</a><a href="https://app.dxtrace.hieuds.com/">Ứng dụng ↗</a></footer>
<dialog id="search-dialog"><form method="dialog" class="search-head"><label for="search-input">Tìm kiếm tài liệu</label><button aria-label="Đóng tìm kiếm">×</button></form><input id="search-input" type="search" placeholder="Keycloak, AppKit, BPMN…" autocomplete="off"><div id="results" aria-live="polite"></div></dialog></body></html>"""
        dest=out/"docs"/key
        dest.mkdir(parents=True)
        (dest/"index.html").write_text(page,encoding="utf-8")
        search.append({"title":title,"path":key+"/index.html","group":section,"text":plain})
        for item in sections:
            section_index.append({"title":title,"heading":item["heading"],"path":key+"/index.html#"+item["anchor"],"group":section,"text":" ".join(item["text"])})
    (assets/"sections.json").write_text(json.dumps(section_index,ensure_ascii=False),encoding="utf-8")
    (assets/"search.json").write_text(json.dumps(search,ensure_ascii=False),encoding="utf-8")
    (out/"index.html").write_text('<!doctype html><html lang="vi"><meta charset="utf-8"><title>DX-TRACE Docs</title><meta http-equiv="refresh" content="0;url=docs/intro/"><a href="docs/intro/">Mở tài liệu DX-TRACE</a></html>',encoding="utf-8")
    (docs/"index.html").write_text('<!doctype html><html lang="vi"><meta charset="utf-8"><title>DX-TRACE Docs</title><meta http-equiv="refresh" content="0;url=intro/"><a href="intro/">Mở tài liệu DX-TRACE</a></html>',encoding="utf-8")
    (out/".nojekyll").touch()
    print(f"Built {len(entries)} documentation pages at {revision[:7]}")

if __name__=="__main__":
    parser=argparse.ArgumentParser()
    parser.add_argument("--out",required=True,type=Path)
    build(parser.parse_args().out.resolve())
