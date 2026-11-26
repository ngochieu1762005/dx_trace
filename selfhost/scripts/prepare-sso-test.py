# SPDX-License-Identifier: MIT
"""Generate one disposable Keycloak realm, accounts and test certificate."""
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
    {"username": name, "firstName": name, "lastName": "Fixture",
     "email": name + "@example.invalid", "emailVerified": True, "enabled": True,
     "credentials": [{"type": "password", "value": password, "temporary": False}]}
    for name, password in users.items()
]
(target / "warehouse.json").write_text(json.dumps(realm))
(target / "users.json").write_text(json.dumps(users))
manifest = yaml.safe_load(Path("../examples/maintenance/app.yaml").read_text())
(target / "manifest.json").write_text(json.dumps(manifest))
