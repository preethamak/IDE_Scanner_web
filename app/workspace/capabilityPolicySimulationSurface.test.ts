import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const panel = readFileSync(new URL("./CapabilityGraphPanel.tsx", import.meta.url), "utf8");
describe("capability policy simulation surface", () => {
  it("simulates a draft before policy persistence", () => {
    expect(panel).toContain("/capability-policy/simulate");
    expect(panel).toContain("Simulate impact");
    expect(panel).toContain("allow");
    expect(panel).toContain("approval");
    expect(panel).toContain("changed");
  });
});
