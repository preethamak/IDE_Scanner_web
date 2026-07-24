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

export function coveragePresentation(detail: Detail): {
  label: string;
  percent: number;
  providerDetail: string;
} {
  const coverage = object(detail.analysis_coverage);
  const status = canonicalAnalysisStatus(detail);
  const percent = Number(
    coverage.executable_file_coverage_percent ?? detail.coverage_percent ?? coverage.coverage_percent ?? 0,
  );
  const required = Array.isArray(coverage.required_providers) ? coverage.required_providers.length : 0;
  const completed = Array.isArray(coverage.completed_required_providers)
    ? coverage.completed_required_providers.length
    : 0;
  const providerCompletionRecorded = typeof coverage.required_providers_complete === "boolean";
  const providersComplete = coverage.required_providers_complete === true;
  const providerDetail = !providerCompletionRecorded
    ? "Analyzer completion was not recorded by this report contract"
    : status === "complete" && providersComplete
    ? required
      ? `${completed}/${required} required analyzers completed`
      : "No required analyzer failed"
    : status === "failed"
      ? "Analysis failed; no approval decision"
      : "Required analysis did not complete";
  return {
    label: "Executable-file coverage",
    percent: Number.isFinite(percent) ? Math.max(0, Math.min(100, percent)) : 0,
    providerDetail,
  };
}
