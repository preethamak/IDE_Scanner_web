#!/usr/bin/env python3
from __future__ import annotations

import argparse
import base64
import json
import mimetypes
import os
import platform
import socket
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.request import Request, urlopen


def main() -> int:
    parser = argparse.ArgumentParser(description="Collect installed VS Code-compatible extensions and upload an inventory report.")
    parser.add_argument("--server", help="Base URL of the IDE Scanner website for one-shot upload mode.")
    parser.add_argument("--token", default=os.environ.get("IDE_SCANNER_AGENT_TOKEN", ""), help="Optional collector bearer token.")
    parser.add_argument("--serve", action="store_true", help="Run a local bridge server for the website to query.")
    parser.add_argument("--host", default="127.0.0.1", help="Bridge bind host. Defaults to 127.0.0.1.")
    parser.add_argument("--port", type=int, default=17865, help="Bridge port. Defaults to 17865.")
    args = parser.parse_args()

    if args.serve:
        serve_bridge(args.host, args.port)
        return 0
    if not args.server:
        parser.error("--server is required unless --serve is used")

    payload = {
        "agent": agent_metadata(),
        "extensions": discover_extensions(compact=True),
    }
    result = post_report(args.server, payload, args.token)
    print(json.dumps(result, indent=2, sort_keys=True))
    return 0


def agent_metadata() -> dict:
    return {
        "schema_version": "0.2.0",
        "generated_at": int(time.time() * 1000),
        "hostname": socket.gethostname(),
        "platform": platform.system(),
        "platform_release": platform.release(),
        "machine": platform.machine(),
        "python": platform.python_version(),
    }


def discover_extensions(compact: bool = False) -> list[dict]:
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
                "manifest": compact_manifest(manifest) if compact else rich_manifest(manifest),
                "icon_data_url": "" if compact else extension_icon_data_url(package_file.parent, manifest),
            })
    return sorted(found, key=lambda item: (item["client"], item["path"]))


def rich_manifest(manifest: dict) -> dict:
    compact = compact_manifest(manifest)
    contributes = manifest.get("contributes") if isinstance(manifest.get("contributes"), dict) else {}
    return {
        **compact,
        "activationEvents": [item for item in manifest.get("activationEvents", []) if isinstance(item, str)][:80]
        if isinstance(manifest.get("activationEvents"), list) else [],
        "main": text(manifest.get("main")),
        "browser": text(manifest.get("browser")),
        "extensionKind": [item for item in manifest.get("extensionKind", []) if isinstance(item, str)][:12]
        if isinstance(manifest.get("extensionKind"), list) else [],
        "categories": [item for item in manifest.get("categories", []) if isinstance(item, str)][:20]
        if isinstance(manifest.get("categories"), list) else [],
        "engines": {"vscode": text((manifest.get("engines") or {}).get("vscode"))}
        if isinstance(manifest.get("engines"), dict) else {},
        "repository": repository(manifest.get("repository")),
        "dependencies": dependency_summary(manifest.get("dependencies")),
        "devDependencies": dependency_summary(manifest.get("devDependencies")),
        "contributes": contributes_summary(contributes),
    }


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


def extension_icon_data_url(extension_root: Path, manifest: dict) -> str:
    icon = manifest.get("icon")
    if not isinstance(icon, str) or not icon.strip():
        return ""
    try:
        root = extension_root.resolve()
        icon_path = (root / icon).resolve()
        icon_path.relative_to(root)
        if not icon_path.is_file():
            return ""
        size = icon_path.stat().st_size
        if size <= 0 or size > 180_000:
            return ""
        mime, _ = mimetypes.guess_type(str(icon_path))
        if mime not in {"image/png", "image/jpeg", "image/svg+xml", "image/webp", "image/gif"}:
            return ""
        data = base64.b64encode(icon_path.read_bytes()).decode("ascii")
        return f"data:{mime};base64,{data}"
    except Exception:
        return ""


def dependency_summary(value: object) -> dict:
    if not isinstance(value, dict):
        return {}
    return {str(key): text(version, 80) for key, version in list(value.items())[:80]}


def contributes_summary(contributes: dict) -> dict:
    out: dict = {}
    for key in ("commands", "views", "configuration", "debuggers", "languages", "grammars", "themes", "snippets", "keybindings", "authentication", "notebooks", "terminal", "taskDefinitions"):
        value = contributes.get(key)
        if isinstance(value, list):
            out[key] = [contribution_label(item) for item in value[:30]]
        elif isinstance(value, dict):
            out[key] = {str(k): contribution_label(v) for k, v in list(value.items())[:30]}
    return out


def contribution_label(value: object) -> str:
    if isinstance(value, dict):
        for key in ("command", "id", "name", "title", "viewType"):
            if isinstance(value.get(key), str):
                return text(value.get(key), 100)
    return text(str(value), 100)


def repository(value: object) -> str:
    if isinstance(value, str):
        return text(value, 200)
    if isinstance(value, dict):
        return text(value.get("url"), 200)
    return ""


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


def serve_bridge(host: str, port: int) -> None:
    class Handler(BaseHTTPRequestHandler):
        def do_OPTIONS(self) -> None:
            self.send_response(204)
            self._cors()
            self.end_headers()

        def do_GET(self) -> None:
            if self.path.split("?", 1)[0] == "/health":
                self._json({"ok": True, "agent": agent_metadata()})
                return
            if self.path.split("?", 1)[0] == "/inventory":
                self._json({"agent": agent_metadata(), "extensions": discover_extensions(compact=False)})
                return
            self.send_response(404)
            self._cors()
            self.end_headers()

        def do_POST(self) -> None:
            if self.path.split("?", 1)[0] == "/scan":
                self._json({"agent": agent_metadata(), "extensions": discover_extensions(compact=False)})
                return
            self.send_response(404)
            self._cors()
            self.end_headers()

        def log_message(self, fmt: str, *args: object) -> None:
            print(f"[collector] {self.address_string()} {fmt % args}")

        def _json(self, payload: dict) -> None:
            body = json.dumps(payload, separators=(",", ":")).encode("utf-8")
            self.send_response(200)
            self._cors()
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def _cors(self) -> None:
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")
            self.send_header("Access-Control-Allow-Private-Network", "true")
            self.send_header("Cache-Control", "no-store")

    server = ThreadingHTTPServer((host, port), Handler)
    print(f"IDE Scanner collector bridge listening on http://{host}:{port}")
    print("Keep this terminal open, then click Connect local collector on the website.")
    server.serve_forever()


if __name__ == "__main__":
    raise SystemExit(main())
