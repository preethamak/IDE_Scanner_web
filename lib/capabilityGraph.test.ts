import { describe, expect, it } from "vitest";
import { buildCapabilityGraph, capabilitySubjectId, evaluateCapabilityGraph } from "./capabilityGraph";
import type { CapabilityGrant } from "./guardrailsPolicy";

const workspaceId = "workspace-1";
const observedAt = "2026-10-21T08:00:00.000Z";
const extension = {
  id: capabilitySubjectId("extension", "github.copilot@1.400.0"),
  kind: "extension" as const,
  name: "GitHub Copilot",
  version: "1.400.0",
  publisher: "GitHub",
  artifactSha256: "a".repeat(64),
  evidenceState: "verified" as const,
  observedAt,
  capabilities: ["network", "editor"] as const,
  source: "collector" as const,
};

describe("capability graph", () => {
  it("normalizes exact artifact subjects into a durable graph", () => {
    const graph = buildCapabilityGraph({ workspaceId, generatedAt: observedAt, subjects: [extension] });
    expect(graph.schemaVersion).toBe("2026-10-01");
    expect(graph.subjects[0]).toMatchObject({ id: "extension:github.copilot@1.400.0", artifactSha256: "a".repeat(64) });
  });

  it("keeps relationships constrained to known subjects", () => {
    expect(() => buildCapabilityGraph({ workspaceId, subjects: [extension], relationships: [{ from: extension.id, to: "mcp_server:unknown", type: "uses" }] })).toThrow("known subjects");
  });

  it("fails closed when claimed capability evidence does not match its evidence state", () => {
    expect(() => buildCapabilityGraph({ workspaceId, subjects: [{ ...extension, evidenceState: "unknown", capabilities: ["network"] }] })).toThrow("Unknown capability evidence");
    expect(() => buildCapabilityGraph({ workspaceId, subjects: [{ ...extension, evidenceState: "verified", artifactSha256: null }] })).toThrow("requires an artifact SHA-256");
    expect(() => buildCapabilityGraph({ workspaceId, subjects: [{ ...extension, evidenceState: "verified", source: "manual" }] })).toThrow("Manual capability imports");
  });

  it("validates relationship vocabulary and removes duplicate edges", () => {
    const cli = { ...extension, id: "cli:guardrails", kind: "cli" as const, name: "GuardRails CLI", artifactSha256: null, evidenceState: "observed" as const };
    expect(() => buildCapabilityGraph({ workspaceId, subjects: [extension, cli], relationships: [{ from: extension.id, to: cli.id, type: "unknown" as never }] })).toThrow("relationship type is invalid");
    const graph = buildCapabilityGraph({ workspaceId, subjects: [extension, cli], relationships: [{ from: extension.id, to: cli.id, type: "uses" }, { from: extension.id, to: cli.id, type: "uses" }] });
    expect(graph.relationships).toEqual([{ from: extension.id, to: cli.id, type: "uses" }]);
  });

  it("fails closed when one observed capability lacks a grant", () => {
    const graph = buildCapabilityGraph({ workspaceId, generatedAt: observedAt, subjects: [extension] });
    const grants: CapabilityGrant[] = [{ id: "allow-network", principalId: "device:eng-1", workspaceId, capability: "network", actions: ["use"], resourcePattern: extension.id, effect: "allow", approval: "automatic" }];
    const [result] = evaluateCapabilityGraph(graph, grants, "device:eng-1", observedAt);
    expect(result.outcome).toBe("deny");
    expect(result.requests.map((item) => item.decision.outcome)).toEqual(["allow", "deny"]);
  });

  it("does not let a grant leak to another exact release", () => {
    const graph = buildCapabilityGraph({ workspaceId, generatedAt: observedAt, subjects: [{ ...extension, id: capabilitySubjectId("extension", "github.copilot@1.401.0") }] });
    const grants: CapabilityGrant[] = [{ id: "allow-old", principalId: "device:eng-1", workspaceId, capability: "network", actions: ["use"], resourcePattern: extension.id, effect: "allow", approval: "automatic" }];
    expect(evaluateCapabilityGraph(graph, grants, "device:eng-1", observedAt)[0].outcome).toBe("deny");
  });
});
