#!/usr/bin/env python3
# SPDX-FileCopyrightText: 2026 DX-TRACE contributors
# SPDX-License-Identifier: MIT
# DX-TRACE project authors: Đặng Nhật Minh, Nguyễn Ngọc Hiếu
"""Create the first DX-TRACE warehouse user through Keycloak Admin REST.

Run locally on the VPS: python3 selfhost/scripts/create-warehouse-user.py

- Makes HTTPS-visible user accounts only in the `warehouse` realm.
- Reads bootstrap admin credential from the local .env if still valid.
- Prompts for a strong user password without echoing or storing it in a file.
- Marks email as verified only with the operator's explicit confirmation.
- Does not recreate or modify the master realm admin, existing users, apps,
  SQLite files, OIDC client, client secrets or persistent volumes.

Copyright (c) 2026 DX-TRACE contributors. SPDX-License-Identifier: MIT.
"""
from __future__ import annotations

import getpass
import json
from pathlib import Path
import re
import sys
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

HOST = "http://127.0.0.1:8181"
REALM = "warehouse"
CONFIG = Path(__file__).resolve().parents[1] / ".env"


def api(path: str, *, method="GET", token="", form=None, payload=None):
    headers = {"Accept": "application/json"}
    data = None
    if form is not None:
        data = urlencode(form).encode()
        headers["Content-Type"] = "application/x-www-form-urlencoded"
    if payload is not None:
        data = json.dumps(payload, ensure_ascii=False).encode()
        headers["Content-Type"] = "application/json"
    if token:
        headers["Authorization"] = "Bearer " + token
    with urlopen(Request(HOST + path, data=data, headers=headers, method=method), timeout=25) as res:
        raw = res.read()
        return (json.loads(raw) if raw else None, res.status)


def env_vars():
    if not CONFIG.is_file():
        raise RuntimeError("Không tìm thấy selfhost/.env. Dừng lại.")
    out = {}
    for line in CONFIG.read_text(encoding="utf-8").splitlines():
        if "=" in line and not line.startswith("#"):
            key, value = line.split("=", 1)
            out[key.strip()] = value
    return out


def get_token(password: str):
    result, _ = api("/realms/master/protocol/openid-connect/token",
        method="POST", form={"client_id":"admin-cli",
            "grant_type":"password","username":"admin","password":password})
    token = (result or {}).get("access_token")
    if not token:
        raise RuntimeError("Keycloak không trả về token quản trị.")
    return token


def main():
    print("TẠO NGƯỜI DÙNG ĐẦU TIÊN CHO DX-TRACE")
    print("Realm: warehouse (KHÔNG phải realm master)")
    print("Truy cập qua Keycloak localhost, không thay đổi dữ liệu kho.")
    app_host = env_vars().get("APP_HOST", "")
    if not app_host or "." not in app_host or "://" in app_host or "/" in app_host:
        raise RuntimeError("APP_HOST không hợp lệ trong selfhost/.env. Dừng lại.")

    username = input("Tên đăng nhập mới (vd: hieu): ").strip()
    if not re.fullmatch(r"[a-zA-Z0-9._-]{3,40}", username):
        raise RuntimeError("Tên đăng nhập cần 3–40 ký tự a-z, 0-9, ., _, -.")
    email = input("Email của chính bạn: ").strip().lower()
    if not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", email) or len(email)>254:
        raise RuntimeError("Email chưa hợp lệ.")
    owner = input("Bạn có kiểm soát hộp thư email này không? [y/N]: ").strip().lower()
    verified = owner in ("y", "yes")

    config = env_vars()
    bootstrap_password = config.get("ADMIN_PASSWORD", "")
    try:
        token = get_token(bootstrap_password) if bootstrap_password else None
    except HTTPError as exc:
        if exc.code not in (400, 401, 403):
            raise
        token = None
    if not token:
        current = getpass.getpass("Mật khẩu admin Keycloak hiện tại (ẩn): ")
        token = get_token(current)

    q = urlencode({"username":username,"exact":"true"})
    found, _ = api(f"/admin/realms/{REALM}/users?{q}", token=token)
    if any(u.get("username", "").lower() == username.lower() for u in (found or [])):
        raise RuntimeError("Username đã tồn tại; không tạo hoặc ghi đè tài khoản.")

    password = getpass.getpass("Mật khẩu tài khoản DX-TRACE mới (>=12 ký tự): ")
    if len(password) < 12:
        raise RuntimeError("Mật khẩu mới phải dài tối thiểu 12 ký tự.")
    repeat = getpass.getpass("Nhập lại mật khẩu DX-TRACE (ẩn): ")
    if password != repeat:
        raise RuntimeError("Hai mật khẩu không khớp.")

    user = {"username":username,"email":email,"enabled":True,
            "emailVerified":verified,"requiredActions":[]}
    try:
        _, status = api(f"/admin/realms/{REALM}/users",method="POST",token=token,payload=user)
    except HTTPError as exc:
        if exc.code == 409:
            raise RuntimeError("Username hoặc email đã tồn tại trong warehouse.") from None
        raise
    if status != 201:
        raise RuntimeError(f"Tạo người dùng thất bại: HTTP {status}")

    users, _ = api(f"/admin/realms/{REALM}/users?{q}",token=token)
    created = [u for u in (users or []) if u.get("username","").lower() == username.lower()]
    if len(created) != 1 or not created[0].get("id"):
        raise RuntimeError("Đã tạo tài khoản nhưng chưa tìm lại được ID; kiểm tra Users trên Keycloak.")
    user_id = created[0]["id"]

    _, status = api(f"/admin/realms/{REALM}/users/{user_id}/reset-password",
        method="PUT",token=token,
        payload={"type":"password","temporary":False,"value":password})
    password = None
    repeat = None
    if status != 204:
        raise RuntimeError(f"Tài khoản đã tạo nhưng đặt mật khẩu trả về HTTP {status}.")

    verify, _ = api(f"/admin/realms/{REALM}/users/{user_id}",token=token)
    if verify.get("username") != username or not verify.get("enabled"):
        raise RuntimeError("Xác nhận tài khoản chưa đạt yêu cầu.")
    print("OK: Đã tạo tài khoản và đặt mật khẩu.")
    print("Username:", username)
    print("Email:", email)
    print("Email verified:", "Có (quản trị viên xác nhận)" if verified else "Chưa")
    print("Mở https://" + app_host + "/ trong cửa sổ ẩn danh để đăng nhập.")
    if not verified:
        print("Lưu ý: cần xác minh email hoặc cấu hình SMTP nếu luồng ứng dụng yêu cầu email đã xác minh.")


if __name__ == "__main__":
    try:
        main()
    except HTTPError as exc:
        print(f"LỖI: Keycloak HTTP {exc.code}. Kiểm tra quyền admin, realm warehouse và chính sách mật khẩu.",file=sys.stderr)
        sys.exit(1)
    except (RuntimeError, URLError, TimeoutError, OSError, ValueError) as exc:
        print("LỖI:",exc,file=sys.stderr)
        sys.exit(1)
