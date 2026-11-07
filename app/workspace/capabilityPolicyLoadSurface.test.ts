import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const panel = readFileSync(new URL("./CapabilityGraphPanel.tsx", import.meta.url), "utf8");
describe("capability policy editor loading", () => { it("loads the saved policy before allowing an edit", () => { expect(panel).toContain("openPolicyEditor"); expect(panel).toContain("Capability policy could not be loaded."); expect(panel).toContain("JSON.stringify({ grants: body.policy?.grants || [] }, null, 2)"); }); });
