#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import platform
import socket
import time
from pathlib import Path
from urllib.request import Request, urlopen


def main() -> int:
    parser = argparse.ArgumentParser(description="Collect installed VS Code-compatible extensions and upload an inventory report.")
    parser.add_argument("--server", required=True, help="Base URL of the IDE Scanner website.")
    parser.add_argument("--token", default=os.environ.get("IDE_SCANNER_AGENT_TOKEN", ""), help="Optional collector bearer token.")
    args = parser.parse_args()

    payload = {
        "agent": {
            "schema_version": "0.1.0",
            "generated_at": int(time.time() * 1000),
            "hostname": socket.gethostname(),
            "platform": platform.system(),
            "platform_release": platform.release(),
            "machine": platform.machine(),
            "python": platform.python_version(),
        },
        "extensions": discover_extensions(),
    }
    result = post_report(args.server, payload, args.token)
    print(json.dumps(result, indent=2, sort_keys=True))
    return 0


def discover_extensions() -> list[dict]:
    found: list[dict] = []
    seen: set[str] = set()
    for client, root in candidate_roots():
        if not root.exists() or not root.is_dir():
            continue
        for package_file in root.glob("*/package.json"):
            try:
                manifest = json.loads(package_file.read_text(encoding="utf-8"))
            except Exception:
                continue
            extension_root = str(package_file.parent)
            if extension_root in seen:
                continue
            seen.add(extension_root)
            found.append({
                "client": client,
                "path": extension_root,
                "manifest": compact_manifest(manifest),
            })
    return sorted(found, key=lambda item: (item["client"], item["path"]))


def compact_manifest(manifest: dict) -> dict:
    scripts = manifest.get("scripts") if isinstance(manifest.get("scripts"), dict) else {}
    return {
        "publisher": text(manifest.get("publisher")),
        "name": text(manifest.get("name")),
        "displayName": text(manifest.get("displayName")),
        "version": text(manifest.get("version")),
        "description": text(manifest.get("description"), 280),
        "activationEvents": [
            item for item in manifest.get("activationEvents", [])
            if isinstance(item, str) and item in {"*", "onStartupFinished"}
        ][:8] if isinstance(manifest.get("activationEvents"), list) else [],
        "scripts": {
            key: text(scripts.get(key), 180)
            for key in ("preinstall", "install", "postinstall")
            if isinstance(scripts.get(key), str)
        },
    }


def text(value: object, limit: int = 120) -> str:
    if not isinstance(value, str):
        return ""
    value = " ".join(value.split())
    return value[:limit]


def candidate_roots() -> list[tuple[str, Path]]:
    home = Path.home()
    roots = [
        ("vscode", home / ".vscode" / "extensions"),
        ("vscode-insiders", home / ".vscode-insiders" / "extensions"),
        ("vscodium", home / ".vscodium" / "extensions"),
        ("cursor", home / ".cursor" / "extensions"),
        ("windsurf", home / ".windsurf" / "extensions"),
    ]
    system = platform.system().lower()
    if system == "darwin":
        roots.extend([
            ("vscode", home / "Library" / "Application Support" / "Code" / "extensions"),
            ("vscode-insiders", home / "Library" / "Application Support" / "Code - Insiders" / "extensions"),
            ("vscodium", home / "Library" / "Application Support" / "VSCodium" / "extensions"),
            ("cursor", home / "Library" / "Application Support" / "Cursor" / "extensions"),
            ("windsurf", home / "Library" / "Application Support" / "Windsurf" / "extensions"),
        ])
    elif system == "windows":
        appdata = os.environ.get("APPDATA")
        if appdata:
            base = Path(appdata)
            roots.extend([
                ("vscode", base / "Code" / "extensions"),
                ("vscode-insiders", base / "Code - Insiders" / "extensions"),
                ("vscodium", base / "VSCodium" / "extensions"),
                ("cursor", base / "Cursor" / "extensions"),
                ("windsurf", base / "Windsurf" / "extensions"),
            ])
    return roots


def post_report(server: str, payload: dict, token: str) -> dict:
    endpoint = server.rstrip("/") + "/api/collector/reports"
    body = json.dumps(payload).encode("utf-8")
    headers = {
        "Content-Type": "application/json",
        "User-Agent": "ide-scanner-lightweight-collector/0.1.0",
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"
    request = Request(endpoint, data=body, headers=headers, method="POST")
    with urlopen(request, timeout=90) as response:
        raw = response.read().decode("utf-8")
        return json.loads(raw) if raw.strip() else {}


if __name__ == "__main__":
    raise SystemExit(main())
