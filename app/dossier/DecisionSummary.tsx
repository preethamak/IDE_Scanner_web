import { coveragePresentation } from "@/lib/classificationContract";
import { decisionExplanation } from "@/lib/dossierPresentation";
import type { ReportScan } from "@/lib/reportContract";

export default function DecisionSummary({ decision, scan }: { decision: string; scan: ReportScan }) {
  const coverage = coveragePresentation(scan);
  const incomplete = coverage.percent < 100 || scan.analysis_status !== "complete";
  const action = decision === "allow" ? "Approval can proceed under your organization’s normal extension controls." : decision === "block" ? "Review the flagged behavior and decide whether your team should block this version." : decision === "review" ? "Review the flagged behavior and record your team’s decision before approval." : "Do not treat this report as approval. Run or wait for complete analysis.";
  return <section className="decisionSummary" aria-label="Decision summary">
    <article><span>Why this result</span><p>{String(scan.decision_reason || decisionExplanation(decision))}</p></article>
    <article><span>Why it matters</span><p>This result covers the downloaded package identified by its hash. Review new versions separately.</p></article>
    <article><span>Recommended action</span><p>{action}</p></article>
    <article><span>Analysis limits</span><p>{incomplete ? `${coverage.providerDetail}. ${coverage.percent}% executable-file coverage was recorded.` : "The required analyzers completed. Check which files were included before making a decision."}</p></article>
  </section>;
}
