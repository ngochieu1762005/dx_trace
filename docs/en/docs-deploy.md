# Publish documentation

## Build locally

```bash
python3 -m venv .venv-docs
. .venv-docs/bin/activate
pip install -r website/requirements.txt
python website/build.py --out /tmp/dxtrace-docs-preview
python website/verify.py /tmp/dxtrace-docs-preview
python -m http.server 8000 --directory /tmp/dxtrace-docs-preview
```

## Existing VPS

```bash
cd /opt/dx_trace
git pull --ff-only origin main
sudo bash website/deploy-vps.sh
```

The script publishes both documentation languages and backs up the previous documentation outside the public web root. It installs the photograph, local fonts, CSS and JavaScript before replacing the two product pages and the 404 page. The warehouse and Quality Portal are deployed through Docker Compose.

The public docs are static and independently deployable. GitHub Pages remains optional.

## Check which documentation is served

After deployment open the Vietnamese index and select the HDPI guide. Switch to English and check the topic is preserved. Search for SUA-005 and open a result. If the build contains the page but the domain shows an older edition, compare Caddy’s document root with the directory published by the deployment script.

## Full source and translation status

This English edition is a curated guide, not a line-for-line translation. For exact implementation details, see the [canonical source](../../website/content/docs-deploy.md).
