import { coveragePresentation } from "@/lib/classificationContract";
import { decisionExplanation } from "@/lib/dossierPresentation";
import type { ReportScan } from "@/lib/reportContract";

export default function DecisionSummary({ decision, scan }: { decision: string; scan: ReportScan }) {
  const coverage = coveragePresentation(scan);
  const incomplete = coverage.percent < 100 || scan.analysis_status !== "complete";
  const action = decision === "allow" ? "Approval can proceed under your organization’s normal extension controls." : decision === "block" ? "Policy-relevant evidence is recorded for this exact artifact. Your team’s policy decides the outcome, with accountable approval." : decision === "review" ? "Review the flagged behavior and record the accountable team decision before approval." : "Do not treat this report as approval. Run or wait for complete analysis.";
  return <section className="decisionSummary" aria-label="Decision summary">
    <article><span>What changed</span><p>{String(scan.decision_reason || decisionExplanation(decision))}</p></article>
    <article><span>Why it matters</span><p>This result applies only to the scanned artifact SHA-256, not to future releases or a publisher generally.</p></article>
    <article><span>Recommended action</span><p>{action}</p></article>
    <article><span>Analysis limits</span><p>{incomplete ? `${coverage.providerDetail}. ${coverage.percent}% executable-file coverage was recorded.` : "Required analysis completed for this exact artifact; evidence remains scoped to scanner coverage."}</p></article>
  </section>;
}
