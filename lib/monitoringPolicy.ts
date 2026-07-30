export type MonitoringInput = { decision: string; severity: string | null; coveragePercent: number; event: "release" | "scan" | "decision"; minimumSeverity: string; releaseAlerts: boolean; scanAlerts: boolean };

const weight: Record<string, number> = { CRITICAL: 5, HIGH: 4, MEDIUM: 3, LOW: 2, INFORMATIONAL: 1 };

export function shouldNotify(input: MonitoringInput): boolean {
  if (input.event === "release") return input.releaseAlerts;
  if (input.event === "scan" && !input.scanAlerts) return false;
  if (input.coveragePercent < 100 || input.decision === "incomplete") return true;
  return (weight[input.severity || "INFORMATIONAL"] || 1) >= (weight[input.minimumSeverity] || 3);
}

export const MAX_NOTIFICATION_ATTEMPTS = 5;

export function retryDisposition(attempts: number): "retry" | "skip" {
  return attempts >= MAX_NOTIFICATION_ATTEMPTS ? "skip" : "retry";
}

export function alertEvent(kind: unknown): MonitoringInput["event"] {
  return String(kind) === "release_detected" ? "release" : String(kind) === "decision_due" ? "decision" : "scan";
}
