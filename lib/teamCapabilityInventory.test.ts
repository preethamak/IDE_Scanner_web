import { describe, expect, it } from "vitest";
import { parseCapabilityGraphImport, graphWithWorkspaceExtensions, mergeCollectorCapabilityGraph } from "./teamCapabilityInventory";

describe("team capability inventory", () => {
  it("accepts typed non-extension capability subjects", () => {
    const graph = parseCapabilityGraphImport({ generatedAt: "2026-10-21T10:00:00.000Z", subjects: [{ id: "mcp_server:github", kind: "mcp_server", name: "GitHub MCP", version: "1", publisher: "GitHub", artifactSha256: null, evidenceState: "observed", observedAt: "2026-10-21T10:00:00.000Z", capabilities: ["network", "tool"], source: "collector" }] }, "team-1");
    expect(graph.subjects[0].id).toBe("mcp_server:github");
  });

  it("derives extension subjects without pretending their capabilities are known", () => {
    const graph = graphWithWorkspaceExtensions("team-1", [{ extension_id: "GitHub.copilot", version: "1.2.3", artifact_sha256: null, reported_at: "2026-10-21T10:00:00.000Z" }], null);
    expect(graph.subjects[0]).toMatchObject({ id: "extension:github.copilot@1.2.3", evidenceState: "observed", capabilities: [] });
  });

  it("refuses malformed subject identity", () => {
    expect(() => parseCapabilityGraphImport({ subjects: [{ id: "mcp_server:has space", kind: "mcp_server" }] }, "team-1")).toThrow("invalid");
  });

  it("replaces stale collector observations without deleting manual records", () => {
    const existing = parseCapabilityGraphImport({ subjects: [
      { id: "mcp_server:old", kind: "mcp_server", name: "Old", version: null, publisher: null, artifactSha256: null, evidenceState: "observed", observedAt: "2026-10-20T10:00:00.000Z", capabilities: [], source: "collector" },
      { id: "cli:internal", kind: "cli", name: "Internal CLI", version: "1", publisher: null, artifactSha256: null, evidenceState: "unknown", observedAt: "2026-10-20T10:00:00.000Z", capabilities: [], source: "manual" },
    ] }, "team-1");
    const incoming = parseCapabilityGraphImport({ subjects: [{ id: "mcp_server:new", kind: "mcp_server", name: "New", version: null, publisher: null, artifactSha256: null, evidenceState: "observed", observedAt: "2026-10-21T10:00:00.000Z", capabilities: ["tool"], source: "collector" }] }, "team-1");
    expect(mergeCollectorCapabilityGraph("team-1", existing, incoming).subjects.map((subject) => subject.id)).toEqual(["cli:internal", "mcp_server:new"]);
  });
});
