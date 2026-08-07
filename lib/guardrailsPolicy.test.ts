import { describe, expect, it } from "vitest";
import {
  evaluatePolicy,
  matchesResource,
  type CapabilityGrant,
  type CapabilityRequest,
} from "./guardrailsPolicy";

const request: CapabilityRequest = {
  id: "request-1",
  principalId: "agent:openai/reviewer@1",
  workspaceId: "workspace-1",
  capability: "filesystem",
  action: "read",
  resource: "workspace/src/index.ts",
  requestedAt: "2026-08-06T12:00:00.000Z",
};

const grant: CapabilityGrant = {
  id: "grant-1",
  principalId: request.principalId,
  workspaceId: request.workspaceId,
  capability: request.capability,
  actions: ["read"],
  resourcePattern: "workspace/src/**",
  effect: "allow",
  approval: "automatic",
};

describe("matchesResource", () => {
  it.each([
    ["workspace/src/**", "workspace/src/index.ts", true],
    ["workspace/src/**", "workspace/src/nested/index.ts", true],
    ["workspace/*.md", "workspace/README.md", true],
    ["workspace/*.md", "workspace/docs/README.md", false],
    ["https://api.example.com/**", "https://api.example.com/v1/models", true],
    ["https://api.example.com/**", "https://evil.example/v1/models", false],
    ["workspace/src/file?.ts", "workspace/src/file1.ts", false],
  ])("matches %s against %s", (pattern, resource, expected) => {
    expect(matchesResource(pattern, resource)).toBe(expected);
  });

  it("rejects empty values and null bytes", () => {
    expect(matchesResource("", request.resource)).toBe(false);
    expect(matchesResource("workspace/**", "workspace/\0secret")).toBe(false);
  });
});

describe("evaluatePolicy", () => {
  it("denies by default when no grant matches", () => {
    expect(evaluatePolicy(request, [])).toEqual({
      outcome: "deny",
      reason: "NO_MATCHING_GRANT",
      requestId: request.id,
    });
  });

  it("allows an exact principal, workspace, capability, action, and resource match", () => {
    expect(evaluatePolicy(request, [grant])).toMatchObject({
      outcome: "allow",
      reason: "GRANT_ALLOWED",
      matchingGrantId: grant.id,
    });
  });

  it("returns prompt rather than allow for an approval-gated grant", () => {
    expect(evaluatePolicy(request, [{ ...grant, approval: "prompt" }])).toMatchObject({
      outcome: "prompt",
      reason: "APPROVAL_REQUIRED",
      matchingGrantId: grant.id,
    });
  });

  it("gives explicit deny precedence regardless of grant order", () => {
    const deny = { ...grant, id: "deny-secret", effect: "deny" as const };
    expect(evaluatePolicy(request, [grant, deny])).toMatchObject({
      outcome: "deny",
      reason: "EXPLICIT_DENY",
      matchingGrantId: deny.id,
    });
    expect(evaluatePolicy(request, [deny, grant])).toMatchObject({
      outcome: "deny",
      reason: "EXPLICIT_DENY",
      matchingGrantId: deny.id,
    });
  });

  it.each([
    ["principal", { principalId: "agent:other" }],
    ["workspace", { workspaceId: "workspace-2" }],
    ["capability", { capability: "network" as const }],
    ["action", { action: "write" }],
    ["resource", { resource: "workspace/.env" }],
  ])("does not leak authority across %s boundaries", (_name, requestChange) => {
    expect(evaluatePolicy({ ...request, ...requestChange }, [grant]).outcome).toBe("deny");
  });

  it("ignores a grant at and after its expiration instant", () => {
    const expiring = { ...grant, expiresAt: request.requestedAt };
    expect(evaluatePolicy(request, [expiring])).toMatchObject({
      outcome: "deny",
      reason: "NO_MATCHING_GRANT",
    });
  });

  it("accepts a grant before its expiration instant", () => {
    const expiring = { ...grant, expiresAt: "2026-08-06T12:00:01.000Z" };
    expect(evaluatePolicy(request, [expiring]).outcome).toBe("allow");
  });

  it("fails closed for malformed expiration values", () => {
    expect(evaluatePolicy(request, [{ ...grant, expiresAt: "eventually" }]).outcome).toBe("deny");
  });

  it.each([
    { id: "" },
    { principalId: "" },
    { workspaceId: "" },
    { action: "" },
    { resource: "" },
    { requestedAt: "not-a-date" },
  ])("fails closed for malformed request %#", (change) => {
    expect(evaluatePolicy({ ...request, ...change }, [grant])).toMatchObject({
      outcome: "deny",
      reason: "INVALID_REQUEST",
    });
  });

  it("does not mutate requests or grants", () => {
    const frozenRequest = Object.freeze({ ...request });
    const frozenGrant = Object.freeze({ ...grant, actions: Object.freeze(["read"]) });
    expect(() => evaluatePolicy(frozenRequest, [frozenGrant])).not.toThrow();
  });
});
