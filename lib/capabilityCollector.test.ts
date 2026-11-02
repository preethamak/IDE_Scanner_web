import { describe, expect, it } from "vitest";
import { applyCollectorSnapshot, parseCollectorSnapshot } from "./capabilityCollector";

const snapshot = { inventory: { device: { id: "eng-1", name: "Engineering laptop", platform: "linux" }, reported_at: "2026-10-21T10:00:00.000Z", extensions: [{ extension_id: "GitHub.copilot", version: "1.2.3", registry: "vs-marketplace", artifact_sha256: null }] }, graph: { subjects: [{ id: "mcp_server:github", kind: "mcp_server", name: "GitHub MCP", version: "1", publisher: "GitHub", artifactSha256: null, evidenceState: "observed", observedAt: "2026-10-21T10:00:00.000Z", capabilities: ["network", "tool"], source: "collector" }], relationships: [] } };

describe("capability collector snapshot", () => {
  it("forces API inventory source and replaces only one device snapshot", () => {
    const parsed = parseCollectorSnapshot(snapshot, "team-1");
    const result = applyCollectorSnapshot({ workspaceId: "team-1", existingGraph: null, inventory: { devices: [{ id: "eng-1" }, { id: "eng-2" }], installations: [{ device_id: "eng-1", extension_id: "old.extension" }, { device_id: "eng-2", extension_id: "keep.extension" }], last_import_at: null }, snapshot: parsed });
    expect(result.inventory.installations.map((item) => item.extension_id)).toEqual(["keep.extension", "GitHub.copilot"]);
    expect(result.graph.subjects[0].id).toBe("mcp_server:github");
  });

  it("rejects manual subjects from machine collector credentials", () => {
    expect(() => parseCollectorSnapshot({ ...snapshot, graph: { ...snapshot.graph, subjects: [{ ...snapshot.graph.subjects[0], source: "manual" }] } }, "team-1")).toThrow("source collector");
  });
});
