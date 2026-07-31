import { describe, expect, it } from "vitest";
import { alertEvent, retryDisposition, shouldNotify } from "@/lib/monitoringPolicy";

describe("shouldNotify", () => {
  const base = { decision: "allow", severity: "LOW", coveragePercent: 100, event: "scan" as const, minimumSeverity: "HIGH", releaseAlerts: true, scanAlerts: true };
  it("suppresses below-threshold complete scans", () => expect(shouldNotify(base)).toBe(false));
  it("keeps incomplete analysis actionable", () => expect(shouldNotify({ ...base, coveragePercent: 74 })).toBe(true));
  it("honors disabled release alerts", () => expect(shouldNotify({ ...base, event: "release", releaseAlerts: false })).toBe(false));
});

describe("delivery controls", () => {
  it("bounds retries and maps persisted alert kinds to policy events", () => {
    expect(retryDisposition(4)).toBe("retry");
    expect(retryDisposition(5)).toBe("skip");
    expect(alertEvent("release_detected")).toBe("release");
    expect(alertEvent("decision_due")).toBe("decision_due");
    expect(alertEvent("review_required")).toBe("high_evidence");
  });

  it("honors each exact monitoring event control", () => {
    const base = { decision: "allow", severity: "LOW", coveragePercent: 100, event: "scan" as const, minimumSeverity: "HIGH", releaseAlerts: true, scanAlerts: true };
    expect(shouldNotify({ ...base, event: "decision_changed", decisionAlerts: false })).toBe(false);
    expect(shouldNotify({ ...base, event: "high_evidence", severity: "HIGH", highEvidenceAlerts: false })).toBe(false);
    expect(shouldNotify({ ...base, event: "provenance_changed", provenanceAlerts: false })).toBe(false);
    expect(shouldNotify({ ...base, event: "coverage_regressed", coverageAlerts: false })).toBe(false);
    expect(shouldNotify({ ...base, event: "decision_due", dueAlerts: false })).toBe(false);
  });
});
