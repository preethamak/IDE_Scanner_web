#!/usr/bin/env python3
"""Reproduce the descriptive statistics reported in the paper.

The input is a directory of content-addressed VSIX files. Only ZIP metadata and
the public extension/package.json manifest are read; extension code is never
executed. Outputs are deterministic JSON and CSV files.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import statistics
import zipfile
from collections import Counter
from pathlib import Path


def as_list(value):
    if value is None:
        return []
    return value if isinstance(value, list) else [value]


def nested_count(value):
    """Count contribution entries stored either as a list or keyed lists."""
    if isinstance(value, list):
        return len(value)
    if isinstance(value, dict):
        return sum(len(item) if isinstance(item, list) else 1 for item in value.values())
    return int(value is not None)


def manifest_from(archive: zipfile.ZipFile):
    candidates = [
        name for name in archive.namelist()
        if name.lower() in {"extension/package.json", "package.json"}
    ]
    if not candidates:
        return None
    return json.loads(archive.read(candidates[0]).decode("utf-8-sig"))


def classify(path: Path):
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    with zipfile.ZipFile(path) as archive:
        manifest = manifest_from(archive)
        if not isinstance(manifest, dict):
            return {"sha256": digest, "bytes": path.stat().st_size, "valid_manifest": False}
        contributes = manifest.get("contributes") or {}
        activation = as_list(manifest.get("activationEvents"))
        dependencies = manifest.get("dependencies") or {}
        dev_dependencies = manifest.get("devDependencies") or {}
        engines = manifest.get("engines") or {}
        categories = as_list(manifest.get("categories"))
        capabilities = manifest.get("capabilities") or {}
        return {
            "sha256": digest,
            "bytes": path.stat().st_size,
            "valid_manifest": True,
            "extension_id": f"{manifest.get('publisher', 'unknown')}.{manifest.get('name', 'unknown')}",
            "version": str(manifest.get("version", "")),
            "license_declared": bool(manifest.get("license")),
            "repository_declared": bool(manifest.get("repository") or manifest.get("homepage")),
            "main_entrypoint": bool(manifest.get("main")),
            "browser_entrypoint": bool(manifest.get("browser")),
            "activation_event_count": len(activation),
            "wildcard_activation": "*" in activation,
            "commands": len(as_list(contributes.get("commands"))),
            "languages": len(as_list(contributes.get("languages"))),
            "debuggers": len(as_list(contributes.get("debuggers"))),
            "task_definitions": len(as_list(contributes.get("taskDefinitions"))),
            "custom_editors": len(as_list(contributes.get("customEditors"))),
            "webview_views": nested_count(contributes.get("views")),
            "authentication": len(as_list(contributes.get("authentication"))),
            "terminal_profiles": nested_count(contributes.get("terminal")),
            "dependency_count": len(dependencies),
            "dev_dependency_count": len(dev_dependencies),
            "vscode_engine": str(engines.get("vscode", "")),
            "category_count": len(categories),
            "untrusted_workspace_limited": isinstance(capabilities.get("untrustedWorkspaces"), dict),
            "virtual_workspace_limited": isinstance(capabilities.get("virtualWorkspaces"), dict),
        }


def pct(n, d):
    return round(100.0 * n / d, 1) if d else 0.0


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("corpus", type=Path)
    parser.add_argument("--out", type=Path, default=Path(__file__).parent)
    args = parser.parse_args()
    paths = sorted(args.corpus.glob("*.vsix"))
    rows = []
    failures = []
    for path in paths:
        try:
            rows.append(classify(path))
        except Exception as exc:
            failures.append({"file": path.name, "error": type(exc).__name__})

    valid = [row for row in rows if row.get("valid_manifest")]
    n = len(valid)
    bool_fields = [
        "license_declared", "repository_declared", "main_entrypoint",
        "browser_entrypoint", "wildcard_activation",
        "untrusted_workspace_limited", "virtual_workspace_limited",
    ]
    count_fields = [
        "activation_event_count", "commands", "languages", "debuggers",
        "task_definitions", "custom_editors", "webview_views",
        "authentication", "terminal_profiles", "dependency_count",
        "dev_dependency_count", "category_count",
    ]
    summary = {
        "schema_version": 1,
        "corpus_directory": args.corpus.name,
        "archive_count": len(paths),
        "valid_manifest_count": n,
        "invalid_or_unreadable_count": len(paths) - n,
        "analysis_failures": failures,
        "total_compressed_bytes": sum(row["bytes"] for row in rows),
        "boolean_metrics": {
            field: {
                "count": sum(bool(row[field]) for row in valid),
                "percent": pct(sum(bool(row[field]) for row in valid), n),
            } for field in bool_fields
        },
        "count_metrics": {
            field: {
                "median": statistics.median(row[field] for row in valid) if valid else 0,
                "maximum": max((row[field] for row in valid), default=0),
                "nonzero_count": sum(row[field] > 0 for row in valid),
                "nonzero_percent": pct(sum(row[field] > 0 for row in valid), n),
            } for field in count_fields
        },
        "top_vscode_engine_constraints": Counter(
            row["vscode_engine"] or "undeclared" for row in valid
        ).most_common(10),
    }
    args.out.mkdir(parents=True, exist_ok=True)
    (args.out / "summary.json").write_text(json.dumps(summary, indent=2) + "\n")
    fieldnames = sorted({key for row in rows for key in row})
    with (args.out / "manifest-features.csv").open("w", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
