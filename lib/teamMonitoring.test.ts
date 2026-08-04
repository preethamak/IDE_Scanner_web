import { describe, expect, it } from "vitest";
import { baselineEligible, materiality, nextMonitoringState } from "@/lib/teamMonitoring";

describe("team monitoring contract", () => {
  it("accepts only complete hash-pinned full-coverage baselines", () => {
    expect(baselineEligible({ analysis_status: "complete", artifact_sha256: "a".repeat(64), coverage_percent: 100 })).toBe(true);
    expect(baselineEligible({ analysis_status: "incomplete", artifact_sha256: "a".repeat(64), coverage_percent: 100 })).toBe(false);
    expect(baselineEligible({ analysis_status: "complete", artifact_sha256: "bad", coverage_percent: 100 })).toBe(false);
  });
  it("only permits explicit monitoring lifecycle transitions", () => {
    expect(nextMonitoringState("baseline_pending", "baseline_set")).toBe("monitoring");
    expect(nextMonitoringState("monitoring", "release_detected")).toBe("release_detected");
    expect(nextMonitoringState("monitoring", "analysis_failed")).toBeNull();
  });
  it("never calls incomplete analysis safe", () => {
    expect(materiality({ analysis_status: "incomplete" })).toBe("analysis_unavailable");
    expect(materiality({ analysis_status: "complete", severity: "HIGH" })).toBe("review_required");
    expect(materiality({ analysis_status: "complete", added_capabilities: ["shell"] })).toBe("review_recommended");
  });
});
