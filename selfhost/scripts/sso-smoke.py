# SPDX-License-Identifier: MIT
"""Exercise two real OIDC code flows through the TLS edge. Never print cookies."""
import json
import ssl
import time
import uuid
from html.parser import HTMLParser
from http.cookiejar import CookieJar
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, urlsplit
from urllib.request import build_opener, HTTPCookieProcessor, HTTPSHandler, ProxyHandler, Request

app = "https://app.example.invalid"
issuer = "https://id.example.invalid"
context = ssl.create_default_context(cafile="/checks/ca.crt")
users = json.loads(Path("/checks/users.json").read_text())


class LoginForm(HTMLParser):
    action = None

    def handle_starttag(self, tag, attributes):
        attrs = dict(attributes)
        if tag == "form" and attrs.get("id") == "kc-form-login":
            self.action = attrs["action"]


def session():
    return build_opener(ProxyHandler({}), HTTPSHandler(context=context), HTTPCookieProcessor(CookieJar()))


def login(name):
    browser = session()
    with browser.open(app + "/oauth2/start?rd=%2Fapi%2Fstate", timeout=15) as page:
        form = LoginForm()
        form.feed(page.read().decode())
    assert form.action and urlsplit(form.action).netloc == "id.example.invalid", "Expected Keycloak login form"
    post = urlencode({"username": name, "password": users[name]}).encode()
    with browser.open(form.action, data=post, timeout=20) as response:
        assert urlsplit(response.url).netloc == "app.example.invalid"
        state = json.load(response)
        assert state["me"]["email"] == name + "@example.invalid"
    return browser


def request(browser, path, body=None, expected=200):
    headers = {"Idempotency-Key": str(uuid.uuid4())}
    if body is not None:
        headers["Content-Type"] = "application/json"
    req = Request(app + path, data=json.dumps(body).encode() if body is not None else None, headers=headers)
    try:
        result = browser.open(req, timeout=20)
    except HTTPError as error:
        assert error.code == expected, f"{path} returned {error.code}, expected {expected}"
        return None
    with result:
        assert result.status == expected and urlsplit(result.url).netloc == "app.example.invalid"
        if "application/json" in result.headers.get("Content-Type", ""):
            return json.load(result)
        return result.read().decode()


for _ in range(100):
    try:
        with session().open(issuer + "/realms/warehouse/.well-known/openid-configuration", timeout=4) as page:
            assert json.load(page)["issuer"] == issuer + "/realms/warehouse"
        with session().open(app + "/oauth2/start", timeout=5) as page:
            assert urlsplit(page.url).netloc == "id.example.invalid"
        break
    except (URLError, OSError, AssertionError):
        time.sleep(2)
else:
    raise RuntimeError("Disposable Keycloak or OAuth2 Proxy did not become ready")

owner = login("inspector")
request(owner, "/api/members", {"email": "supervisor@example.invalid", "role": "manager"})
manager = login("supervisor")
assert request(manager, "/api/state")["me"]["role"] == "manager"
manifest = json.loads(Path("/checks/manifest.json").read_text())
paths = manifest["spec"]["schemas"] + manifest["spec"]["workflows"]
files = {path: (Path("/checks/package") / path).read_text() for path in paths}
request(owner, "/api/packages/maintenance/install", {"revision": 0, "package": {"manifest": manifest, "files": files}})
for browser in (owner, manager):
    assert "DX-TRACE" in request(browser, "/")
    assert "Sổ kiểm định" in request(browser, "/apps/quality/")
    assert "portal.mjs" in request(browser, "/maintenance")
    assert request(browser, "/api/portals/maintenance")["route"]["path"] == "/maintenance"
request(manager, "/api/packages/maintenance/uninstall", {"revision": 1}, 403)
# Anonymous navigation may show the proxy's sign-in page or go to Keycloak.
with session().open(app + "/maintenance", timeout=15) as page:
    assert b"portal.mjs" not in page.read()
def access_token(client):
    form = urlencode({"client_id": client, "grant_type": "password", "username": "inspector",
                      "password": users["inspector"], "scope": "openid email"}).encode()
    with session().open(issuer + "/realms/warehouse/protocol/openid-connect/token", data=form, timeout=10) as response:
        return json.load(response)["access_token"]


def external(token, path, data=None, expected=200):
    headers = {"Authorization": "Bearer " + token, "Idempotency-Key": str(uuid.uuid4()), "Content-Type": "application/json"}
    req = Request("http://external-api:8093" + path, headers=headers, data=None if data is None else json.dumps(data).encode())
    try:
        with session().open(req, timeout=12) as response:
            assert response.status == expected
            return json.load(response)
    except HTTPError as error:
        assert error.code == expected, f"{path} returned {error.code}, expected {expected}"


model = "pkg_maintenance_maintenance"
records = "/models/" + model + "/records"
token = access_token("dx-ci")
created = external(token, "/v2" + records, {"data": {"equipment": "P-17", "description": "CI inspection", "priority": "Thường"}})
record_path = "/v2" + records + "/" + created["id"]
assert external(token, record_path)["data"]["equipment"] == "P-17"
assert external(token, record_path + "/tasks")["tasks"]
external(token, record_path + "/transition", {"version": 1, "target": "submitted"})
decision = external(token, record_path + "/evidence")["decisions"][0]
assert decision["signing_status"] == "signed"
visible = external(token, "/v1" + records)
assert [m["id"] for m in visible["models"]] == [model]
assert created["id"] in [r["id"] for r in request(owner, "/api/models/" + model + "/records")["records"]]
for version in ("/v1", "/v2"):
    external(access_token("dx-other"), version + records, expected=403)
    external(access_token("dx-training"), version + records, expected=404)
print("PASS Keycloak token, external API v1/v2, APISIX, SQLite read/write, signed decision and workspace boundaries")
request(owner, "/api/packages/maintenance/uninstall", {"revision": 1})
request(manager, "/maintenance", expected=404)
print("PASS two Keycloak logins, three portals, shared tenant, protected route and owner-only uninstall")
