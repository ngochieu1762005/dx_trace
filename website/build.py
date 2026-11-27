# SPDX-FileCopyrightText: 2026 DX-TRACE contributors
# SPDX-License-Identifier: MIT
# DX-TRACE project authors: Đặng Nhật Minh, Nguyễn Ngọc Hiếu
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
    markdown = (ROOT / source).read_text(encoding="utf-8")
    if markdown.startswith("<!-- SPDX-FileCopyrightText:"):
        _, end, body = markdown.partition("-->")
        if end:
            markdown = body.lstrip("\n")
    tokens = MD.parse(markdown)
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

def build(out, lang='vi'):
    en = lang == 'en'
    groups = json.loads((SITE/("navigation.en.json" if en else "navigation.json")).read_text(encoding="utf-8"))
    for source in ([] if en else sorted((ROOT/"docs/releases").glob("RELEASE_NOTES_*.md"),reverse=True)):
        version = source.stem.removeprefix("RELEASE_NOTES_")
        groups[-1][1].append(["release-"+version,source.relative_to(ROOT).as_posix(),version])
    entries = [item for _,items in groups for item in items]
    routes = {source:key for key,source,_ in entries}
    # Keep links to the detailed source on the same route when a Vietnamese
    # handbook chapter has its own text. Each language gets its own search index.
    detailed_sources = {}
    if not en:
        localized = []
        for key, source, title in entries:
            chapter = SITE/"content"/(key+".vi.md")
            if chapter.is_file():
                detailed_sources[key] = source
                source = chapter.relative_to(ROOT).as_posix()
                routes[source] = key
            localized.append((key, source, title))
        entries = localized
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
        if key in detailed_sources:
            reference = quote(detailed_sources[key], safe="/")
            body += f'<p><a href="{REPO}/blob/{revision}/{reference}">Xem tài liệu kỹ thuật gốc trên GitHub</a></p>'
        section = next(group for group,items in groups if any(x[0]==key for x in items))
        sidebar = "".join('<details class="nav-group"'+(' open' if group==section else '')+'><summary>'+E(group)+"</summary>"+
            "".join('<a href="'+E(link(k))+'"'+(' aria-current="page"' if k==key else '')+">"+E(t)+"</a>" for k,_,t in items)+"</details>" for group,items in groups)
        toc = "".join('<a class="'+tag+'" href="#'+E(anchor)+'">'+E(t)+"</a>" for tag,t,anchor in headings)
        paging = ""
        for offset,label in ((-1,"← Previous" if en else "← Trang trước"),(1,"Next →" if en else "Trang sau →")):
            if 0<=i+offset<len(entries):
                k,_,t=entries[i+offset]
                paging+='<a href="'+E(link(k))+'"><small>'+label+"</small><strong>"+E(t)+"</strong></a>"
        cards = ""
        if key == "intro":
            if en:
                description = "Install DX-TRACE, run warehouse operations and connect your own applications."
                primary = "Run locally"
                architecture = "View system architecture"
                guides = [
                    ("warehouse-guide", "Operate the warehouse", "Receive stock, dispatch a lot and trace delivery destinations."),
                    ("recall-guide", "Coordinate a recall", "Review an inspection, quarantine the lot and reconcile returns."),
                    ("deployment-checklist", "Deploy on a server", "Prepare services, accounts and backups."),
                    ("api-reference", "Integrate with the API", "Find HTTP routes, authentication and request examples."),
                ]
            else:
                description = "Cài ứng dụng, vận hành kho và kết nối hệ thống của bạn."
                primary = "Chạy trên máy cá nhân"
                architecture = "Xem kiến trúc hệ thống"
                guides = [
                    ("warehouse-guide", "Vận hành kho", "Nhập hàng, lập phiếu xuất và truy đến từng điểm nhận."),
                    ("recall-guide", "Điều phối thu hồi", "Thẩm định phiếu, cách ly lô và đối soát hàng trả."),
                    ("deployment-checklist", "Triển khai trên máy chủ", "Chuẩn bị dịch vụ, tài khoản và bản sao lưu."),
                    ("api-reference", "Tích hợp qua API", "Tra đường dẫn HTTP, quyền và ví dụ gửi yêu cầu."),
                ]
            cards = (
                '<div class="start">'
                f'<p>{description}</p><div class="actions"><a class="primary" href="{link("quickstart")}">{primary}</a>'
                f'<a href="{link("architecture")}">{architecture}</a></div></div>'
                '<div class="cards">' + ''.join(
                    f'<a href="{link(route)}"><strong>{label}</strong><span>{desc}</span></a>'
                    for route, label, desc in guides
                ) + '</div>'
            )
        if key == "api-reference":
            label = "Filter API routes" if en else "Lọc đường dẫn API"
            cards = f'<div class="api-tools"><label for="api-filter">{label}</label><input id="api-filter" type="search" placeholder="/models, GET…"><span id="api-count" aria-live="polite"></span></div>'
        if cards:
            body = body.replace("</h1>", "</h1>" + cards, 1)
        page = f"""<!doctype html>
<html lang="{lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="description" content="{E(title)} · Tài liệu kỹ thuật DX-TRACE">
<title>{E(title)} | {"DX-TRACE Docs" if en else "Tài liệu DX-TRACE"}</title>
<link rel="icon" type="image/svg+xml" href="../assets/brand.svg"><link rel="stylesheet" href="../assets/site.css"><script defer src="../assets/site.js"></script></head>
<body data-root="../"><a class="skip" href="#content">Bỏ qua điều hướng</a>
<header class="topbar"><button class="menu" id="menu" type="button" aria-label="Menu tài liệu" aria-controls="sidebar" aria-expanded="false"><span class="menu-lines" aria-hidden="true"></span></button>
<a class="brand" href="../intro/index.html"><img src="../assets/brand.svg" width="36" height="36" alt=""><strong>DX-TRACE</strong><span>{"Docs" if en else "Tài liệu"}</span></a>
<nav class="toplinks"><a href="https://dxtrace.hieuds.com/login">{"Open workspace" if en else "Vào kho"}</a><a href="../api-reference/index.html">API</a><a href="https://dxtrace.hieuds.com/">Sản phẩm</a></nav>
<div class="top-actions"><a class="locale" href="{("../../"+key+"/index.html") if en else ("../en/"+key+"/index.html")}" hreflang="{"vi" if en else "en"}">{"Tiếng Việt" if en else "English"}</a><button id="search-open" class="search-trigger" type="button" aria-label="Tìm tài liệu"><span class="search-glass" aria-hidden="true"></span><span>Tìm tài liệu</span> <kbd>Ctrl K</kbd></button><button id="theme" type="button" aria-label="Đổi giao diện sáng tối"><span class="theme-disc" aria-hidden="true"></span></button><a class="github" href="{REPO}">GitHub</a></div></header>
<div class="layout"><aside id="sidebar" class="sidebar" aria-label="Mục lục tài liệu"><div class="version"><span>{"Revision" if en else "Phiên bản tài liệu"}</span><code>{revision[:7]}</code></div><label class="sidebar-label" for="nav-filter">Danh mục tài liệu</label><input id="nav-filter" type="search" placeholder="Lọc danh mục…" autocomplete="off">{sidebar}</aside>
<main id="content" class="main"><div class="breadcrumb">Tài liệu <span>›</span> {E(section)} <span>›</span> {E(title)}</div><article>{body}</article><div class="page-feedback"><strong>Tài liệu này có hữu ích?</strong><a href="{REPO}/issues/new">Gửi góp ý hoặc báo lỗi</a></div>
<div class="source"><a href="{REPO}/blob/{revision}/{quote(source,safe='/')}">Xem nguồn tài liệu</a><span>MIT · {revision[:7]}</span></div><nav class="pagination" aria-label="Trang liền kề">{paging}</nav></main>
<aside class="toc" aria-label="Mục lục trang"><strong>Trong trang này</strong>{toc or '<span>Giới thiệu</span>'}<div class="toc-bottom"><button type="button" id="print-page">In / lưu PDF</button><a href="{REPO}/issues">Góp ý tài liệu</a></div></aside></div>
<footer><a href="https://dxtrace.hieuds.com/{'en/' if en else ''}">{"Product home" if en else "Trang giới thiệu"}</a><a href="{REPO}/releases">{"Releases" if en else "Bản phát hành"}</a><a href="{REPO}/issues">{"Issues" if en else "Báo lỗi"}</a><a href="https://app.dxtrace.hieuds.com/">Ứng dụng</a></footer>
<dialog id="search-dialog"><form method="dialog" class="search-head"><label for="search-input">Tìm kiếm tài liệu</label><button aria-label="Đóng tìm kiếm">×</button></form><input id="search-input" type="search" placeholder="Keycloak, AppKit, BPMN…" autocomplete="off"><div id="results" aria-live="polite"></div></dialog></body></html>"""
        if en:
            # Translate template chrome only; English article and navigation are authored separately.
            translations = {"Tài liệu kỹ thuật DX-TRACE":"DX-TRACE technical documentation","Bỏ qua điều hướng":"Skip navigation","Menu tài liệu":"Documentation menu","Tài liệu</a>":"Documentation</a>","Sản phẩm</a>":"Product</a>","Tìm tài liệu":"Search docs","Đổi giao diện sáng tối":"Toggle theme","Mục lục tài liệu":"Documentation navigation","Danh mục tài liệu":"Documentation","Lọc danh mục…":"Filter navigation…","Tài liệu <span>":"Docs <span>","Tài liệu này có hữu ích?":"Was this page helpful?","Gửi góp ý hoặc báo lỗi":"Send feedback or report an issue","Xem nguồn tài liệu":"View source","Trang liền kề":"Adjacent pages","Mục lục trang":"Page outline","Trong trang này":"On this page","Giới thiệu</span>":"Overview</span>","In / lưu PDF":"Print / save PDF","Góp ý tài liệu":"Documentation feedback","Ứng dụng":"Application","Tìm kiếm tài liệu":"Search documentation","Đóng tìm kiếm":"Close search","https://dxtrace.hieuds.com/\">Product":"https://dxtrace.hieuds.com/en/\">Product"}
            for old,new in translations.items():
                page = page.replace(old,new)
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
    out=parser.parse_args().out.resolve()
    build(out)
    # Build separate English pages and search indexes; preserve the original Vietnamese paths.
    temp=out.parent/(out.name+"-english")
    build(temp,"en")
    shutil.move(str(temp/"docs"),str(out/"docs/en"))
    shutil.rmtree(temp)
    # Explicit language entry points, without duplicating the Vietnamese document tree.
    vi=out/"docs/vi"
    vi.mkdir()
    (vi/"index.html").write_text('<!doctype html><html lang="vi"><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=../intro/"><a href="../intro/">Tiếng Việt</a></html>',encoding="utf-8")
    (out/"docs/en/index.html").write_text('<!doctype html><html lang="en"><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=intro/"><a href="intro/">English documentation</a></html>',encoding="utf-8")

    from platform_pages import publish
    publish(out)
