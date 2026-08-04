export const monitoringStates = ["baseline_pending", "monitoring", "release_detected", "analysis_incomplete", "analysis_failed"] as const;
export type MonitoringState = (typeof monitoringStates)[number];
export type Materiality = "informational" | "review_recommended" | "review_required" | "analysis_unavailable";

export function baselineEligible(scan: { analysis_status?: unknown; artifact_sha256?: unknown; coverage_percent?: unknown }): boolean {
  return scan.analysis_status === "complete" && typeof scan.artifact_sha256 === "string" && /^[0-9a-f]{64}$/i.test(scan.artifact_sha256) && Number(scan.coverage_percent) >= 100;
}

export function nextMonitoringState(current: MonitoringState, event: "release_detected" | "analysis_incomplete" | "analysis_failed" | "baseline_set"): MonitoringState | null {
  const transitions: Record<MonitoringState, Partial<Record<typeof event, MonitoringState>>> = {
    baseline_pending: { baseline_set: "monitoring" },
    monitoring: { release_detected: "release_detected" },
    release_detected: { analysis_incomplete: "analysis_incomplete", analysis_failed: "analysis_failed" },
    analysis_incomplete: { release_detected: "release_detected" },
    analysis_failed: { release_detected: "release_detected" },
  };
  return transitions[current][event] || null;
}

export function materiality(input: { analysis_status?: unknown; decision?: unknown; severity?: unknown; added_capabilities?: unknown[]; added_findings?: unknown[]; publisher_changed?: boolean }): Materiality {
  if (input.analysis_status !== "complete") return "analysis_unavailable";
  if (input.publisher_changed || input.decision === "block" || ["CRITICAL", "HIGH"].includes(String(input.severity)) || (input.added_findings || []).length) return "review_required";
  if ((input.added_capabilities || []).length || input.decision === "review") return "review_recommended";
  return "informational";
}
