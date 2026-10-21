import { describe, expect, it } from "vitest";
import { parseCapabilityGraphImport, graphWithWorkspaceExtensions } from "./teamCapabilityInventory";

describe("team capability inventory", () => {
  it("accepts typed non-extension capability subjects", () => {
    const graph = parseCapabilityGraphImport({ generatedAt: "2026-10-21T10:00:00.000Z", subjects: [{ id: "mcp_server:github", kind: "mcp_server", name: "GitHub MCP", version: "1", publisher: "GitHub", artifactSha256: null, evidenceState: "observed", observedAt: "2026-10-21T10:00:00.000Z", capabilities: ["network", "tool"], source: "collector" }] }, "team-1");
    expect(graph.subjects[0].id).toBe("mcp_server:github");
  });

  it("derives extension subjects without pretending their capabilities are known", () => {
    const graph = graphWithWorkspaceExtensions("team-1", [{ extension_id: "GitHub.copilot", version: "1.2.3", artifact_sha256: null, reported_at: "2026-10-21T10:00:00.000Z" }], null);
    expect(graph.subjects[0]).toMatchObject({ id: "extension:github.copilot@1.2.3", evidenceState: "observed", capabilities: [] });
  });

  it("keeps declared extensions that have not been observed in a device inventory", () => {
    const saved = parseCapabilityGraphImport({
      generatedAt: "2026-10-21T10:00:00.000Z",
      subjects: [
        { id: "extension:ms-python.python", kind: "extension", name: "ms-python.python", version: null, publisher: "ms-python", artifactSha256: null, evidenceState: "observed", observedAt: "2026-10-21T10:00:00.000Z", capabilities: ["editor"], source: "collector" },
        { id: "extension:github.copilot", kind: "extension", name: "github.copilot", version: null, publisher: "github", artifactSha256: null, evidenceState: "observed", observedAt: "2026-10-21T10:00:00.000Z", capabilities: ["editor"], source: "collector" },
      ],
    }, "team-1");

    const graph = graphWithWorkspaceExtensions("team-1", [{ extension_id: "github.copilot", version: "1.2.3", artifact_sha256: null, reported_at: "2026-10-21T10:00:00.000Z" }], saved);

    expect(graph.subjects.map((subject) => subject.id)).toEqual(["extension:github.copilot@1.2.3", "extension:ms-python.python"]);
    expect(graph.subjects.find((subject) => subject.id === "extension:ms-python.python")).toMatchObject({ capabilities: ["editor"], source: "collector" });
  });

  it("refuses malformed subject identity", () => {
    expect(() => parseCapabilityGraphImport({ subjects: [{ id: "mcp_server:has space", kind: "mcp_server" }] }, "team-1")).toThrow("invalid");
  });
});
