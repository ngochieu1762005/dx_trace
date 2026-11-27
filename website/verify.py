# SPDX-FileCopyrightText: 2026 DX-TRACE contributors
# SPDX-License-Identifier: MIT
# DX-TRACE project authors: Đặng Nhật Minh, Nguyễn Ngọc Hiếu
# SPDX-License-Identifier: MIT
import json
import sys
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit, unquote

class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links=[]
        self.ids=set()
    def handle_starttag(self,tag,attrs):
        for key,value in attrs:
            if key=="id" and value:
                assert value not in self.ids, value
                self.ids.add(value)
            if key in ("href","src") and value:
                self.links.append(value)

root=Path(sys.argv[1]).resolve()
entries=json.loads((root/"docs/assets/search.json").read_text(encoding="utf-8"))
assert len(entries)>=50
assert len({x["path"] for x in entries})==len(entries)
for entry in entries:
    path=root/"docs"/entry["path"]
    assert path.is_file(), path
    parser=Links()
    parser.feed(path.read_text(encoding="utf-8"))
    for value in parser.links:
        parsed=urlsplit(value)
        if parsed.scheme or parsed.netloc or not parsed.path:
            continue
        target=(path.parent/unquote(parsed.path)).resolve()
        assert target.is_relative_to(root), value
        assert target.exists(), (path,value)
assert (root/".nojekyll").exists()
assert (root/"docs/index.html").is_file()
assert (root/"docs/assets/brand.svg").is_file()
assert (root/"docs/assets/site.js").is_file()
print("Verified",len(entries),"pages, search index and local asset links")

sections=json.loads((root/"docs/assets/sections.json").read_text(encoding="utf-8"))
assert len(sections)>len(entries), "Missing section search index"
for entry in sections:
    parsed=urlsplit(entry["path"])
    path=root/"docs"/parsed.path
    parser=Links()
    parser.feed(path.read_text(encoding="utf-8"))
    assert parsed.fragment in parser.ids, entry["path"]
print("Verified",len(sections),"section anchors")

english=root/"docs/en"
en_entries=json.loads((english/"assets/search.json").read_text(encoding="utf-8"))
assert {x["path"] for x in en_entries}=={x["path"] for x in entries}, "Locale routes differ"
for item in en_entries:
    path=english/item["path"]
    content=path.read_text(encoding="utf-8")
    assert '<html lang="en">' in content
    parser=Links()
    parser.feed(content)
    for value in parser.links:
        parsed=urlsplit(value)
        if parsed.scheme or parsed.netloc or not parsed.path:
            continue
        target=(path.parent/unquote(parsed.path)).resolve()
        assert target.is_relative_to(root) and target.exists(), (path,value)
en_sections=json.loads((english/"assets/sections.json").read_text(encoding="utf-8"))
for item in en_sections:
    url=urlsplit(item["path"])
    parser=Links()
    parser.feed((english/url.path).read_text(encoding="utf-8"))
    assert url.fragment in parser.ids
assert not (root/"docs/api-explorer").exists(), "Public API Explorer must not be published"
for path in (root/"docs").rglob("*.html"):
    parser=Links()
    parser.feed(path.read_text(encoding="utf-8"))
    assert all("/docs/api-explorer" not in link and "api-explorer/" not in link for link in parser.links), path
print("Verified",len(en_entries),"English pages; public API Explorer omitted")

# Public product pages must keep readers in the selected language, including
# links into the handbook. The language switch is the one cross-locale link.
for lang, prefix, alternate in (("vi", "", "/en"), ("en", "/en", "")):
    for route in ("platform", "developers", "applications", "evidence", "benchmarks", "olp"):
        page = root / prefix.strip("/") / route / "index.html"
        content = page.read_text(encoding="utf-8")
        assert f'<html lang="{lang}">' in content, page
        parser = Links()
        parser.feed(content)
        switch = f"{alternate}/{route}/"
        assert switch in parser.links, (page, switch)
        for value in parser.links:
            url = urlsplit(value)
            if url.scheme or url.netloc or not url.path.startswith("/"):
                continue
            target = root / unquote(url.path.lstrip("/"))
            assert target.exists(), (page, value)
            if value == switch or url.path.startswith("/assets/"):
                continue
            assert url.path.startswith(("/en/", "/docs/en/")) == (lang == "en"), (page, value)
print("Verified navigation for six product pages in each language")

# Every published language pair must have reciprocal sitemap entries.
site = "https://dxtrace.hieuds.com"
namespace = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9",
             "x": "http://www.w3.org/1999/xhtml"}
alternates = {}
for element in ET.parse(root/"sitemap.xml").findall("s:url", namespace):
    url = element.findtext("s:loc", namespaces=namespace)
    assert url not in alternates and url.startswith(site + "/"), url
    assert (root/urlsplit(url).path.lstrip("/")/"index.html").is_file(), url
    links = {link.attrib["hreflang"]: link.attrib["href"]
             for link in element.findall("x:link[@rel='alternate']", namespace)}
    assert set(links) == {"vi", "en"} and url in links.values(), url
    alternates[url] = links
for links in alternates.values():
    assert all(alternates[target] == links for target in links.values()), links
for entry in entries:
    route = entry["path"].removesuffix("index.html")
    assert alternates[site+"/docs/"+route]["en"] == site+"/docs/en/"+route
print("Verified", len(alternates), "paired sitemap URLs")

# Both published walkthroughs must identify the candidate shown on the OLP page.
from platform_pages import TAG, COMMIT

for edition in (root/"docs", root/"docs/en"):
    demo = (edition/"demo/index.html").read_text(encoding="utf-8")
    assert f"<code>{TAG}</code>" in demo and COMMIT in demo, (edition, "outdated walkthrough")
    assert "<!-- SPDX-FileCopyrightText:" not in demo and "&lt;!-- SPDX-FileCopyrightText:" not in demo
