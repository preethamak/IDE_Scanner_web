export type DossierRecord = Record<string, unknown>;

export function decisionLabel(value: string) {
  return value === "allow"
    ? "Analyzed"
    : value === "review"
      ? "Attention"
      : value === "block"
        ? "Flagged by policy"
        : value === "failed"
          ? "Analysis failed"
          : "Analysis pending";
}

export function decisionExplanation(value: string) {
  return value === "allow"
    ? "Required analysis completed without evidence that crosses the review policy."
    : value === "review"
      ? "Flagged behavior needs context before this exact artifact is approved."
      : value === "block"
        ? "Policy-relevant evidence was recorded for this exact artifact; your team's policy decides the outcome."
        : value === "failed"
          ? "Artifact acquisition or required analysis failed; no approval decision exists."
          : "Required analysis did not complete; this artifact cannot be approved yet.";
}

export function decisionHeadline(value: string) {
  return value === "allow"
    ? "No evidence currently requires review."
    : value === "review"
      ? "Review the flagged behavior before installation."
      : value === "block"
        ? "Team policy must resolve the flagged evidence for this version."
        : value === "failed"
          ? "Analysis failed before a decision could be assigned."
          : "Analysis must complete before an approval decision.";
}

export function outcomeGroupSummary(decision: string, count: number) {
  if (decision === "incomplete" || decision === "failed") {
    return "Analysis did not produce an approval decision.";
  }
  if (decision === "block") {
    return count
      ? `${count} evidence group${count === 1 ? "" : "s"} back this policy flag.`
      : "The canonical policy reason requires a team decision for this artifact.";
  }
  if (decision === "review" && count) {
    return `${count} behavior group${count === 1 ? " needs" : "s need"} context before approval.`;
  }
  return "No behavior group currently requires review.";
}

export function evidenceSectionLabel(decision: string) {
  if (decision === "block") return "Evidence supporting this decision";
  if (decision === "review") return "Evidence that drives review";
  if (decision === "incomplete" || decision === "failed") {
    return "Evidence collected before completion";
  }
  return "Evidence assessed by policy";
}

export function selectPackagedReadme(files: DossierRecord[]) {
  return files
    .filter((item) =>
      /(^|\/)readme\.(?:md|markdown|rst)$/i.test(String(item.path || "")),
    )
    .sort((left, right) => {
      const leftPath = String(left.path || "");
      const rightPath = String(right.path || "");
      const depth = leftPath.split("/").length - rightPath.split("/").length;
      return depth || leftPath.localeCompare(rightPath, undefined, { sensitivity: "base" });
    })[0];
}
