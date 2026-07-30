import { describe, expect, it } from "vitest";
import { shouldNotify } from "@/lib/monitoringPolicy";

describe("shouldNotify", () => {
  const base = { decision: "allow", severity: "LOW", coveragePercent: 100, event: "scan" as const, minimumSeverity: "HIGH", releaseAlerts: true, scanAlerts: true };
  it("suppresses below-threshold complete scans", () => expect(shouldNotify(base)).toBe(false));
  it("keeps incomplete analysis actionable", () => expect(shouldNotify({ ...base, coveragePercent: 74 })).toBe(true));
  it("honors disabled release alerts", () => expect(shouldNotify({ ...base, event: "release", releaseAlerts: false })).toBe(false));
});
