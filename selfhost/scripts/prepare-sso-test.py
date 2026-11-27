# SPDX-FileCopyrightText: 2026 DX-TRACE contributors
# SPDX-License-Identifier: MIT
# DX-TRACE project authors: Đặng Nhật Minh, Nguyễn Ngọc Hiếu
# SPDX-License-Identifier: MIT
"""Generate one disposable Keycloak realm, accounts and test certificate."""
import hashlib
import uuid
import json
import secrets
import subprocess
from pathlib import Path

import yaml

target = Path(".sso-test")
target.mkdir(mode=0o700)
tls = target / "tls"
tls.mkdir()
subprocess.run([
    "openssl", "req", "-x509", "-newkey", "rsa:2048", "-nodes", "-days", "1",
    "-subj", "/CN=DX-TRACE CI",
    "-addext", "subjectAltName=DNS:app.example.invalid,DNS:id.example.invalid",
    "-keyout", str(tls / "server.key"), "-out", str(tls / "server.crt"),
], check=True, stderr=subprocess.DEVNULL)
realm = json.loads(Path("realm.json").read_text())
users = {name: secrets.token_urlsafe(32) for name in ("inspector", "supervisor")}
realm["users"] = [
    {"id": str(uuid.uuid5(uuid.NAMESPACE_DNS, name + ".example.invalid")), "username": name, "firstName": name, "lastName": "Fixture",
     "email": name + "@example.invalid", "emailVerified": True, "enabled": True,
     "credentials": [{"type": "password", "value": password, "temporary": False}]}
    for name, password in users.items()
]
# Only this disposable realm enables the password grant for its fixture clients.
owner_id = realm["users"][0]["id"]
workspace = "ws-" + hashlib.sha256(("oidc:" + owner_id).encode()).hexdigest()
scopes = ["dxtrace.records.read", "dxtrace.records.create", "dxtrace.tasks.read", "dxtrace.evidence.read", "dxtrace.records.transition"]
clients = []
policies = []
for client, org, area in [("dx-ci", workspace, "live"), ("dx-other", "ws-unrelated", "live"), ("dx-training", workspace, "training")]:
    clients.append({"clientId": client, "enabled": True, "publicClient": True,
        "protocol": "openid-connect", "directAccessGrantsEnabled": True, "standardFlowEnabled": False,
        "protocolMappers": [
            {"name": "resource", "protocol": "openid-connect", "protocolMapper": "oidc-audience-mapper",
             "config": {"included.custom.audience": "dx-trace-external-api", "access.token.claim": "true"}}]})
    policies.append({"clientId": client, "workspace": org, "area": area, "models": ["pkg_maintenance_maintenance"],
                     "requestsPerMinute": 60, "scopes": scopes})
(target / "oidc-fixtures.json").write_text(json.dumps({"clients": clients, "scopes": scopes}))
(target / "external-clients.json").write_text(json.dumps({"version": 2, "clients": policies}))
(target / "warehouse.json").write_text(json.dumps(realm))
(target / "users.json").write_text(json.dumps(users))
manifest = yaml.safe_load(Path("../examples/maintenance/app.yaml").read_text())
(target / "manifest.json").write_text(json.dumps(manifest))
