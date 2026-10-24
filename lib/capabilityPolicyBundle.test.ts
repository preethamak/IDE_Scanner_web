import { describe, expect, it } from "vitest";
import { buildCapabilityPolicyExport, parseCapabilityPolicy } from "./capabilityPolicyBundle";
import { buildCapabilityGraph } from "./capabilityGraph";

const graph = buildCapabilityGraph({ workspaceId: "team-1", generatedAt: "2026-10-21T10:00:00.000Z", subjects: [{ id: "mcp_server:github", kind: "mcp_server", name: "GitHub", version: null, publisher: null, artifactSha256: null, evidenceState: "observed", observedAt: "2026-10-21T10:00:00.000Z", capabilities: ["network"], source: "collector" }] });
describe("capability policy bundle", () => {
  it("binds every grant to the workspace and exports a deny-by-default enforcement document", () => {
    const policy = parseCapabilityPolicy({ grants: [{ id: "allow-github", principalId: "workspace:enforcement", capability: "network", actions: ["use"], resourcePattern: "mcp_server:github", effect: "allow", approval: "automatic" }] }, "team-1", "owner-1");
    const exported = buildCapabilityPolicyExport(policy, graph);
    expect(policy.grants[0].workspaceId).toBe("team-1");
    expect(exported).toMatchObject({ default_action: "deny", policy_version: 1, evaluations: [{ subject_id: "mcp_server:github", outcome: "allow" }] });
    expect(exported.policy_hash).toHaveLength(64);
  });
  it("rejects duplicate ids and unsafe deny approval modes", () => {
    expect(() => parseCapabilityPolicy({ grants: [{ id: "same", principalId: "p", capability: "network", actions: ["use"], resourcePattern: "**", effect: "deny", approval: "prompt" }] }, "team-1", "owner")).toThrow("deny rules");
  });
  it("marks a subject with no observed capabilities for approval instead of allowing it", () => {
    const unknown = buildCapabilityGraph({ workspaceId: "team-1", subjects: [{ id: "cli:internal", kind: "cli", name: "Internal", version: null, publisher: null, artifactSha256: null, evidenceState: "unknown", observedAt: "2026-10-21T10:00:00.000Z", capabilities: [], source: "manual" }] });
    const policy = parseCapabilityPolicy({ grants: [] }, "team-1", "owner");
    expect(buildCapabilityPolicyExport(policy, unknown).evaluations[0].outcome).toBe("prompt");
  });
});
