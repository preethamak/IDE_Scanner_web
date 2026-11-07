import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const panel = readFileSync(new URL("./CapabilityGraphPanel.tsx", import.meta.url), "utf8");
describe("capability policy rollback surface", () => { it("restores a retained version through an explicit control", () => { expect(panel).toContain("/capability-policy/rollback"); expect(panel).toContain("Restore v{item.version}"); expect(panel).toContain("Retained policy versions"); }); });
