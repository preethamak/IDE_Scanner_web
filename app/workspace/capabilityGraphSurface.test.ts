import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const panel = readFileSync(new URL("./CapabilityGraphPanel.tsx", import.meta.url), "utf8");

describe("capability graph policy controls", () => {
  it("lets administrators author an explicit policy and export an enforceable bundle", () => {
    expect(panel).toContain('fetch(`/api/teams/${encodeURIComponent(teamId)}/capability-policy`');
    expect(panel).toContain('method: "PUT"');
    expect(panel).toContain('fetch(`/api/teams/${encodeURIComponent(teamId)}/capability-policy/export`');
    expect(panel).toContain('link.download = "guardrails-capability-policy.json"');
  });

  it("keeps the policy UI fail-closed and scoped to managers", () => {
    expect(panel).toContain('const canManage = ["owner", "admin", "analyst"].includes(role)');
    expect(panel).toContain("Policies deny by default.");
    expect(panel).toContain("Deny rules override allows. Unobserved capability evidence requires approval.");
    expect(panel).toContain('aria-label="Capability policy JSON"');
  });
});
