# DX-TRACE Documentation Portal

Custom static documentation website (no Docusaurus). Existing Markdown plus curated guides are compiled into an independently deployable docs directory.

```bash
python -m pip install -r website/requirements.txt
python website/build.py --out /tmp/dxtrace-docs
python website/verify.py /tmp/dxtrace-docs
python -m http.server 8000 --directory /tmp/dxtrace-docs
```

Open http://localhost:8000/docs/. For the existing Ubuntu host with Caddy serving /srv/dx-trace/landing, install python3-venv and run sudo bash website/deploy-vps.sh from the repository. Build and verify before replacing docs; backup is outside the public root. The script also updates the tracked landing index with a docs link; it does not modify Caddy or Docker. All documentation assets live within docs/assets. GitHub Pages remains optional; enable Settings → Pages → GitHub Actions for the existing workflow.
