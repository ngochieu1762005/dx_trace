#!/usr/bin/env python3
# SPDX-FileCopyrightText: 2026 DX-TRACE contributors
# SPDX-License-Identifier: MIT
# DX-TRACE project authors: Đặng Nhật Minh, Nguyễn Ngọc Hiếu
"""Check or fix DX-TRACE OAuth2 redirect URIs using Keycloak's Admin REST API.

Uses the local Keycloak port already published on 127.0.0.1:8181.
Reads the existing bootstrap password from selfhost/.env, preserves all
other client settings and never prints passwords, tokens or client secrets.

Usage:
  python3 selfhost/scripts/fix-oidc-redirect.py          # inspect only
  python3 selfhost/scripts/fix-oidc-redirect.py --apply  # add both URIs
"""
# DX-TRACE | Copyright (c) 2026 DX-TRACE contributors | SPDX-License-Identifier: MIT
from __future__ import annotations

import argparse
import getpass
import json
from pathlib import Path
import sys
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

HERE = Path(__file__).resolve().parents[1]
ENV = HERE / ".env"
LOCAL = "http://127.0.0.1:8181"
REALM = "warehouse"
CLIENT_ID = "dx-trace"



def get_env() -> dict[str, str]:
    if not ENV.is_file():
        raise RuntimeError("Khong tim thay selfhost/.env; khong tao lai khoa bi mat.")
    vals = {}
    for line in ENV.read_text(encoding="utf-8").splitlines():
        if "=" in line and not line.lstrip().startswith("#"):
            k, v = line.split("=", 1)
            vals[k.strip()] = v
    return vals


def request_json(path: str, *, token: str = "", method: str = "GET",
                 form: dict | None = None, payload: dict | None = None):
    headers = {"Accept": "application/json"}
    data = None
    if form is not None:
        data = urlencode(form).encode("utf-8")
        headers["Content-Type"] = "application/x-www-form-urlencoded"
    if payload is not None:
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        headers["Content-Type"] = "application/json"
    if token:
        headers["Authorization"] = "Bearer " + token
    req = Request(LOCAL + path, data=data, headers=headers, method=method)
    with urlopen(req, timeout=20) as res:
        body = res.read()
        return json.loads(body) if body else None


def admin_token(password: str) -> str:
    r = request_json(
        "/realms/master/protocol/openid-connect/token",
        method="POST",
        form={
            "client_id": "admin-cli",
            "grant_type": "password",
            "username": "admin",
            "password": password,
        },
    )
    if not isinstance(r, dict) or not r.get("access_token"):
        raise RuntimeError("Keycloak khong tra ve access token.")
    return r["access_token"]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--old-app-host", default="", help="Optional old app host to retain for rollback")
    parser.add_argument("--apply", action="store_true",
                        help="Append exact redirect URIs to the existing OIDC client")
    args = parser.parse_args()
    env = get_env()
    app_host = env.get("APP_HOST", "")
    print("APP_HOST:", app_host or "(chua co)")
    if not app_host or "." not in app_host or "://" in app_host or "/" in app_host:
        raise RuntimeError("APP_HOST phai la ten mien hop le trong .env; dung lai.")
    new_uri = f"https://{app_host}/oauth2/callback"
    old_uri = f"https://{args.old_app_host}/oauth2/callback" if args.old_app_host else None

    password = env.get("ADMIN_PASSWORD")
    if not password:
        password = getpass.getpass("Mat khau admin Keycloak (khong hien thi): ")
    try:
        token = admin_token(password)
    except HTTPError as exc:
        if exc.code not in (400, 401, 403):
            raise
        print("Mat khau bootstrap trong .env co the da thay doi.")
        password = getpass.getpass("Nhap mat khau admin Keycloak hien tai: ")
        token = admin_token(password)

    query = urlencode({"clientId": CLIENT_ID})
    matches = request_json(
        f"/admin/realms/{REALM}/clients?{query}", token=token
    )
    exact = [x for x in (matches or []) if x.get("clientId") == CLIENT_ID]
    if len(exact) != 1:
        raise RuntimeError(
            f"Phai tim thay dung 1 client {CLIENT_ID!r} trong realm {REALM!r}; "
            f"tim thay {len(exact)}. Khong thay doi gi."
        )
    client_uuid = exact[0].get("id")
    if not client_uuid:
        raise RuntimeError("Client khong co UUID; dung lai.")
    path = f"/admin/realms/{REALM}/clients/{client_uuid}"
    client = request_json(path, token=token)
    if client.get("clientId") != CLIENT_ID:
        raise RuntimeError("Client ID khong khop. Dung lai.")

    before = client.get("redirectUris") or []
    if not isinstance(before, list):
        raise RuntimeError("redirectUris khong phai danh sach; dung lai.")
    after = list(dict.fromkeys([*before, *([old_uri] if old_uri else []), new_uri]))
    print("Realm:", REALM)
    print("Client:", CLIENT_ID)
    print("Redirect URIs hien tai:")
    for uri in before:
        print("  -", uri)
    if not args.apply:
        print("Che do kiem tra: KHONG cap nhat.")
        print("Callback moi:", "DA CO" if new_uri in before else "CHUA CO")
        print("Chay voi --apply de them URI neu can.")
        return 0
    if after == before:
        print("Khong can sua: ca hai callback da duoc phep.")
    else:
        client["redirectUris"] = after
        request_json(path, token=token, method="PUT", payload=client)
        print("Da gui yeu cau cap nhat Keycloak.")

    verified = request_json(path, token=token)
    actual = verified.get("redirectUris") or []
    print("Redirect URIs sau khi doc lai tu Keycloak:")
    for uri in actual:
        print("  -", uri)
    if new_uri not in actual or (old_uri and old_uri not in actual):
        raise RuntimeError("XAC NHAN THAT BAI: Keycloak chua luu du ca hai callback.")
    print("OK: Keycloak da cho phep redirect_uri cua", app_host)
    print("Mo cua so an danh moi va thu lai https://" + app_host + "/")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except HTTPError as exc:
        print(f"LOI: Keycloak HTTP {exc.code} tai {exc.url.split('?')[0]}", file=sys.stderr)
        print("Kiem tra quyen admin, realm warehouse va client dx-trace.", file=sys.stderr)
        raise SystemExit(1)
    except (RuntimeError, URLError, TimeoutError, OSError, ValueError) as exc:
        print("LOI:", str(exc), file=sys.stderr)
        raise SystemExit(1)
