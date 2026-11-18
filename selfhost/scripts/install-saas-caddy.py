#!/usr/bin/env python3
"""Safely migrate a Caddy installation to DX-TRACE landing + app + SSO.

Requires explicit site names; never assumes the operator uses the project's demo
domains. Preserves all unrelated Caddy blocks. Run --dry-run first.
Copyright (c) 2026 DX-TRACE contributors. SPDX-License-Identifier: MIT.
"""
from __future__ import annotations
import argparse
import datetime as dt
import os
import pwd
import re
import shutil
import stat
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONFIG = Path("/etc/caddy/Caddyfile")
SNIPPET = ROOT / "Caddyfile.ubuntu.saas.snippet"
HOST_RE = re.compile(r"^(?=.{1,253}$)[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?$")


def host(value: str) -> str:
    value = value.strip().lower()
    if not HOST_RE.fullmatch(value) or ".." in value or "." not in value:
        raise argparse.ArgumentTypeError("Expected a valid domain name")
    return value


def remove_exact_blocks(source: str, hosts: tuple[str, ...]):
    """Remove only uniquely named top-level Caddy blocks.

    Quoted strings and inline comments are ignored for brace counting.
    Refuse to edit if required original blocks are absent or ambiguous.
    """
    lines = source.splitlines(keepends=True)
    names = set(hosts)
    header = re.compile(r"^([A-Za-z0-9.-]+)\s*\{\s*(?:#.*)?$")
    counts = {h: 0 for h in hosts}
    kept = []
    i = 0
    while i < len(lines):
        line = lines[i]
        m = header.match(line)
        if not m or m.group(1) not in names:
            kept.append(line)
            i += 1
            continue
        name = m.group(1)
        counts[name] += 1
        if counts[name] > 1:
            raise ValueError("Duplicate Caddy site block: " + name)
        depth = 0
        while i < len(lines):
            chunk = lines[i]
            chunk = re.sub(r'"(?:\\.|[^"\\])*"', '""', chunk.split("#", 1)[0])
            depth += chunk.count("{") - chunk.count("}")
            i += 1
            if depth == 0:
                break
            if depth < 0:
                raise ValueError("Unbalanced Caddy braces: " + name)
        else:
            raise ValueError("Unterminated Caddy block: " + name)
    for required in hosts[:2]:
        if counts[required] != 1:
            raise ValueError(f"Expected exactly one existing {required} block, found {counts[required]}; no changes")
    return "".join(kept).rstrip() + "\n\n", counts


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--old-app-host", required=True, type=host, help="Existing public app site (becomes landing)")
    parser.add_argument("--id-host", required=True, type=host, help="Existing Keycloak site")
    parser.add_argument("--app-host", required=True, type=host, help="New protected app site")
    parser.add_argument("--landing-host", type=host, help="Landing site; defaults to old app host")
    parser.add_argument("--landing-root", type=Path, default=ROOT.parent / "landing")
    parser.add_argument("--caddyfile", type=Path, default=CONFIG)
    parser.add_argument("--snippet", type=Path, default=SNIPPET)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--skip-reload", action="store_true", help="Offline validation only")
    args = parser.parse_args()

    landing_host = args.landing_host or args.old_app_host
    if len({landing_host, args.id_host, args.app_host}) != 3:
        raise ValueError("Landing, app and identity domains must be different")
    if not args.caddyfile.is_file() or not args.snippet.is_file():
        raise ValueError("Missing existing Caddyfile or template")
    landing_root = args.landing_root.resolve()
    if not (landing_root / "index.html").is_file():
        raise ValueError("Landing root must contain index.html; no changes made")
    # Catch the common /root or private checkout deployment before changing Caddy.
    try:
        pwd.getpwnam("caddy")
    except KeyError:
        pass  # Custom service account: operator verifies access in the deployment guide.
    else:
        if os.geteuid() == 0:
            readable = subprocess.run(["runuser", "-u", "caddy", "--", "test", "-r", str(landing_root / "index.html")])
            if readable.returncode:
                raise ValueError("Caddy cannot read landing/index.html. Publish landing under /srv with readable parent directories; no configuration changed.")
    original = args.caddyfile.read_text(encoding="utf-8")
    retained, removed = remove_exact_blocks(original, (args.old_app_host, args.id_host, args.app_host))
    template = args.snippet.read_text(encoding="utf-8")
    template = template.replace("landing.example.org", landing_host)
    template = template.replace("app.example.org", args.app_host)
    template = template.replace("id.example.org", args.id_host)
    template = template.replace("/srv/dx-trace/landing", str(landing_root))
    candidate = retained + template.rstrip() + "\n"
    print("Replacing:", removed)
    print("Unrelated Caddy sites preserved. No demo domains hard-coded.")
    if args.dry_run:
        print("DRY RUN: no files edited.")
        return 0

    path = args.caddyfile
    metadata = path.stat()
    stamp = dt.datetime.now(dt.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    backup = path.with_name(path.name + ".before-dxtrace-" + stamp)
    tmp = path.with_name(".Caddyfile.dxtrace-validate-" + stamp)
    shutil.copy2(path, backup)
    try:
        tmp.write_text(candidate, encoding="utf-8")
        os.chmod(tmp, stat.S_IMODE(metadata.st_mode))
        os.chown(tmp, metadata.st_uid, metadata.st_gid)
        subprocess.run(["caddy", "validate", "--config", str(tmp), "--adapter", "caddyfile"], check=True)
        shutil.copy2(tmp, path)
        os.chown(path, metadata.st_uid, metadata.st_gid)
        os.chmod(path, stat.S_IMODE(metadata.st_mode))
        if not args.skip_reload:
            subprocess.run(["systemctl", "reload", "caddy"], check=True)
    except Exception:
        shutil.copy2(backup, path)
        os.chown(path, metadata.st_uid, metadata.st_gid)
        os.chmod(path, stat.S_IMODE(metadata.st_mode))
        if not args.skip_reload:
            subprocess.run(["systemctl", "reload", "caddy"], check=False)
        print("Restored original Caddyfile from:", backup, file=sys.stderr)
        raise
    finally:
        tmp.unlink(missing_ok=True)
    print("OK: Caddy updated; other sites preserved. Backup:", backup)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, ValueError, subprocess.CalledProcessError) as exc:
        print("ERROR:", exc, file=sys.stderr)
        raise SystemExit(1)
