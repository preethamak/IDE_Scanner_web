export type AnalysisStatus = "complete" | "incomplete" | "failed";

type Detail = Record<string, unknown>;

function object(value: unknown): Detail {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Detail : {};
}

export function canonicalAnalysisStatus(detail: Detail): AnalysisStatus {
  const status = String(detail.analysis_status || object(detail.analysis_coverage).status || "incomplete");
  return status === "complete" || status === "failed" ? status : "incomplete";
}

export function displayedDecision(detail: Detail): "allow" | "review" | "block" | "incomplete" | "failed" {
  const status = canonicalAnalysisStatus(detail);
  if (status !== "complete") return status;
  const decision = String(detail.decision || "incomplete");
  return decision === "allow" || decision === "review" || decision === "block" ? decision : "incomplete";
}

export function requiresReview(actionability: unknown): boolean {
  return ["review", "investigate", "block"].includes(String(actionability || "contextual"));
}
