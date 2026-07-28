export type DossierRecord = Record<string, unknown>;

export function decisionLabel(value: string) {
  return value === "allow"
    ? "No known concern"
    : value === "review"
      ? "Review needed"
      : value === "block"
        ? "Do not install"
        : value === "failed"
          ? "Analysis failed"
          : "Analysis incomplete";
}

export function decisionExplanation(value: string) {
  return value === "allow"
    ? "Required analysis completed without evidence that crosses the review policy."
    : value === "review"
      ? "Review the cited behavior before approving this exact artifact."
      : value === "block"
        ? "The scanner found evidence that requires this exact artifact to be rejected."
        : value === "failed"
          ? "Artifact acquisition or required analysis failed; no approval decision exists."
          : "Required analysis did not complete; this artifact cannot be approved yet.";
}

export function decisionHeadline(value: string) {
  return value === "allow"
    ? "No evidence currently requires review."
    : value === "review"
      ? "Review decision-relevant behavior before installation."
      : value === "block"
        ? "This exact artifact should not be installed."
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
      ? `${count} evidence group${count === 1 ? "" : "s"} support this do-not-install decision.`
      : "The canonical policy reason requires rejecting this artifact.";
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
