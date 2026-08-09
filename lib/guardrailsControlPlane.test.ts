import { describe, expect, it } from "vitest";
import { brokerReceipt, templateGrants } from "@/lib/guardrailsControlPlane";

const requests = [
  { id: "source", capability: "filesystem" as const, action: "read", resource: "workspace/src/policy.ts" },
  { id: "network", capability: "network" as const, action: "connect", resource: "https://registry.npmjs.org/lodash" },
  { id: "command", capability: "process" as const, action: "execute", resource: "npm:test" },
];

describe("browser control-plane templates", () => {
  it("keeps the locked template read-only", () => {
    expect(templateGrants("locked", "agent:one", "workspace:one", requests)).toEqual([expect.objectContaining({ capability: "filesystem", actions: ["read"], approval: "automatic" })]);
  });

  it("requires a prompt for the structured command in review mode", () => {
    expect(templateGrants("review", "agent:one", "workspace:one", requests)).toEqual(expect.arrayContaining([expect.objectContaining({ capability: "process", approval: "prompt", resourcePattern: "npm:test" })]));
  });

  it("limits package audit egress to the exact registry request", () => {
    expect(templateGrants("package-audit", "agent:one", "workspace:one", requests)).toEqual(expect.arrayContaining([expect.objectContaining({ capability: "network", resourcePattern: "https://registry.npmjs.org/lodash" })]));
  });

  it("never places a secret value in credential receipts", () => {
    expect(brokerReceipt("credential", "allow")).toBe("credential · opaque-handle-only · allow");
    expect(brokerReceipt("credential", "allow")).not.toMatch(/token|secret:\/\//i);
  });
});
