import { ArrowRight } from "lucide-react";
import { coveragePresentation } from "@/lib/classificationContract";
import type { ReportScan } from "@/lib/reportContract";
import type { CapabilityRecord } from "@/app/dossier/CapabilitiesSection";
import { EvidenceGroup, type EvidenceGroupData } from "@/app/dossier/AlertsSection";
import styles from "./reportShell.module.css";

type Props = { decision: string; scan: ReportScan; actionableGroups: EvidenceGroupData[]; noteGroups: EvidenceGroupData[]; capabilities: Record<string, CapabilityRecord>; onOpenAlerts: () => void; onOpenCapabilities: () => void };

export default function OverviewSection({ decision, scan, actionableGroups, noteGroups, capabilities, onOpenAlerts, onOpenCapabilities }: Props) {
  const entries = Object.entries(capabilities);
  const coverage = coveragePresentation(scan);
  const complete = scan.analysis_status === "complete";
  return <div className={styles.evidenceOverview} id="overview">
    <section aria-labelledby="report-findings-heading">
      <div className={styles.sectionHeading}><div><span>Review first</span><h2 id="report-findings-heading">{actionableGroups.length ? `${actionableGroups.length} behavior group${actionableGroups.length === 1 ? " needs" : "s need"} review` : "Actionable findings"}</h2></div><button type="button" onClick={onOpenAlerts}>View all findings <ArrowRight size={15} /></button></div>
      {actionableGroups.length ? <div className="dossierRows">{actionableGroups.slice(0, 4).map((group) => <EvidenceGroup key={group.rule} group={group} />)}</div> : <div className={styles.noFindings}><strong>{complete ? "No actionable findings were recorded." : "Analysis is not complete."}</strong><p>{complete ? "Review the observed capabilities below against the extension’s purpose before making your team’s decision." : "An empty findings list does not establish that this release passed review. Check which files and analyzers completed."}</p></div>}
      {actionableGroups.length > 4 ? <button className={styles.moreEvidence} onClick={onOpenAlerts}>Inspect all {actionableGroups.length} behavior groups <ArrowRight size={15} /></button> : null}
    </section>
    <section aria-labelledby="report-capabilities-heading">
      <div className={styles.sectionHeading}><div><span>Observed access</span><h2 id="report-capabilities-heading">Capabilities in this package</h2></div><button type="button" onClick={onOpenCapabilities}>Inspect capabilities <ArrowRight size={15} /></button></div>
      <p className={styles.sectionDescription}>Capabilities describe access, not malicious intent. Missing observations are not a guarantee of absence.</p>
      {entries.length ? <dl className={styles.capabilityList}>{entries.slice(0, 6).map(([key, value]) => <div key={key}><dt>{String(value.name || value.label || key).replaceAll("_", " ")}</dt><dd>{Array.isArray(value.evidence) ? `${value.evidence.length} recorded location${value.evidence.length === 1 ? "" : "s"}` : "Declared or detected in this package"}</dd></div>)}</dl> : <p className={styles.noCapability}>This scan did not record any capability families. Check coverage before interpreting this result.</p>}
    </section>
    {noteGroups.length ? <details className={styles.contextNotes}><summary>{noteGroups.length} contextual or hardening note{noteGroups.length === 1 ? "" : "s"}</summary><p>These observations did not independently require review under this scan’s policy.</p><div className="dossierRows">{noteGroups.slice(0, 3).map((group) => <EvidenceGroup key={group.rule} group={group} />)}</div>{noteGroups.length > 3 ? <button type="button" onClick={onOpenAlerts}>Read all {noteGroups.length} notes <ArrowRight size={15} /></button> : null}</details> : null}
    <details className={styles.diagnostics}><summary>Analysis details & diagnostic indices</summary><p>{coverage.providerDetail}. {coverage.percent}% executable-file coverage. Policy result: {decision}.</p><dl><div><dt>Malware signal</dt><dd>{Number(scan.malware_score || 0)}</dd></div><div><dt>Risk index</dt><dd>{Number(scan.risk_score || 0)}</dd></div></dl><p>Diagnostic indices are scanner measurements, not probabilities or guarantees of safety. Runtime behavior and future releases are outside this static report.</p></details>
  </div>;
}
