# DX-TRACE Documentation Portal

Custom static website: Python + markdown-it-py, HTML, CSS and vanilla JavaScript. No Docusaurus, no runtime API, no external font/CDN requests required for the UI. Existing repository Markdown is the source of truth.

```bash
python -m pip install -r website/requirements.txt
python website/build.py --out /tmp/dxtrace-docs
python website/verify.py /tmp/dxtrace-docs
python -m http.server 8000 --directory /tmp/dxtrace-docs
```

Open http://localhost:8000/docs/intro/. The output directory must be new. Configure repository Settings → Pages → Source → GitHub Actions once; the Documentation workflow publishes on main and provides a preview artifact on pull requests. The intended GitHub Pages URL is https://ngochieu1762005.github.io/dx_trace/docs/intro/ after successful deployment. No production app configuration changes are required.
