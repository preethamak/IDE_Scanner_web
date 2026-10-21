from __future__ import annotations

import importlib.util
import json
import tempfile
import unittest
from pathlib import Path


def collector_module():
    path = Path(__file__).resolve().parents[1] / "public" / "collect-ide-extensions.py"
    spec = importlib.util.spec_from_file_location("collector", path)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class CollectorContractTests(unittest.TestCase):
    def test_jsonc_keeps_string_content_while_removing_syntax(self) -> None:
        collector = collector_module()
        parsed = json.loads(collector.strip_jsonc('{"value": ",]", // note\n "items": ["a",],}'))
        self.assertEqual(parsed, {"value": ",]", "items": ["a"]})

    def test_workspace_graph_collects_declared_extension_and_mcp_identity_only(self) -> None:
        collector = collector_module()
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / ".vscode").mkdir()
            (root / ".cursor").mkdir()
            (root / ".vscode" / "extensions.json").write_text('{"recommendations": ["ms-python.python",],}')
            (root / ".cursor" / "mcp.json").write_text(json.dumps({"mcpServers": {"review": {"command": "node", "args": ["private-value"], "env": {"TOKEN": "secret"}}}}))
            graph = collector.discover_workspace_capabilities(root)

        subjects = {subject["id"]: subject for subject in graph["subjects"]}
        self.assertEqual(subjects["extension:ms-python.python"]["capabilities"], ["editor"])
        self.assertEqual(subjects["mcp_server:review"]["capabilities"], ["tool", "process"])
        self.assertNotIn("private-value", json.dumps(graph))
        self.assertNotIn("secret", json.dumps(graph))

    def test_allowed_origin_accepts_only_http_origin_shape(self) -> None:
        collector = collector_module()
        self.assertEqual(collector.allowed_origin("https://guardrails.example"), "https://guardrails.example")
        self.assertIsNone(collector.allowed_origin("https://guardrails.example/path"))
        self.assertIsNone(collector.allowed_origin("javascript:alert(1)"))


if __name__ == "__main__":
    unittest.main()
