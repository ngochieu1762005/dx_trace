# SPDX-License-Identifier: MIT
import json
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit, unquote

class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links=[]
    def handle_starttag(self,tag,attrs):
        for key,value in attrs:
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
