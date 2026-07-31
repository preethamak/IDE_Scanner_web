export type MonitoringEvent = "release" | "scan" | "decision_changed" | "high_evidence" | "provenance_changed" | "coverage_regressed" | "decision_due";
export type MonitoringInput = {
  decision: string;
  severity: string | null;
  coveragePercent: number;
  event: MonitoringEvent;
  minimumSeverity: string;
  releaseAlerts: boolean;
  scanAlerts: boolean;
  decisionAlerts?: boolean;
  highEvidenceAlerts?: boolean;
  provenanceAlerts?: boolean;
  coverageAlerts?: boolean;
  dueAlerts?: boolean;
};

const weight: Record<string, number> = { CRITICAL: 5, HIGH: 4, MEDIUM: 3, LOW: 2, INFORMATIONAL: 1 };

export function shouldNotify(input: MonitoringInput): boolean {
  if (input.event === "release") return input.releaseAlerts;
  if (input.event === "scan" && !input.scanAlerts) return false;
  if (input.event === "decision_changed" && input.decisionAlerts === false) return false;
  if (input.event === "high_evidence" && input.highEvidenceAlerts === false) return false;
  if (input.event === "provenance_changed" && input.provenanceAlerts === false) return false;
  if (input.event === "coverage_regressed" && input.coverageAlerts === false) return false;
  if (input.event === "decision_due") return input.dueAlerts !== false;
  if (input.coveragePercent < 100 || input.decision === "incomplete") return true;
  return (weight[input.severity || "INFORMATIONAL"] || 1) >= (weight[input.minimumSeverity] || 3);
}

export const MAX_NOTIFICATION_ATTEMPTS = 5;

export function retryDisposition(attempts: number): "retry" | "skip" {
  return attempts >= MAX_NOTIFICATION_ATTEMPTS ? "skip" : "retry";
}

export function alertEvent(kind: unknown): MonitoringInput["event"] {
  const value = String(kind);
  if (value === "release_detected") return "release";
  if (value === "decision_due") return "decision_due";
  if (value === "decision_changed") return "decision_changed";
  if (value === "provenance_changed") return "provenance_changed";
  if (value === "coverage_regressed" || value === "coverage_incomplete") return "coverage_regressed";
  if (value === "review_required" || value === "confirmed_threat") return "high_evidence";
  return "scan";
}
