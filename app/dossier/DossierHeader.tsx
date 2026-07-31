import DeepScanButton from "@/app/DeepScanButton";
import ExtensionIdentity from "@/app/ExtensionIdentity";
import ReportActions from "@/app/ReportActions";
import { coveragePresentation, displayedDecision } from "@/lib/classificationContract";
import { decisionExplanation, decisionLabel } from "@/lib/dossierPresentation";
import type { ExtensionDossierData } from "@/lib/reportContract";

type Props = Pick<ExtensionDossierData, "id" | "version" | "extension" | "scan">;

export default function DossierHeader({ id, version, extension, scan }: Props) {
  const decision = displayedDecision(scan);
  const coverage = coveragePresentation(scan);
  const scannedAt = scan.scanned_at ? new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(String(scan.scanned_at))) : "Scan time unavailable";
  const nextAction = decision === "allow" ? "Proceed under normal extension controls" : decision === "block" ? "Do not install this artifact" : decision === "review" ? "Record a team decision before approval" : "Wait for complete analysis";
  return <header className="dossierMast">
    <ExtensionIdentity
      size="lg"
      eyebrow="Exact artifact intelligence"
      id={id}
      version={version}
      name={extension.display_name}
      iconUrl={extension.icon_url}
      publisher={extension.publisher}
      verified={extension.publisher_verified}
    />
    <div className={`dossierDecision ${decision}`}>
      <span>Security outcome</span>
      <strong>{decisionLabel(decision)}</strong>
      <p>{String(scan.decision_reason || decisionExplanation(decision))}</p>
      <small>{coverage.percent}% executable-file coverage · exact version only</small>
      <dl className="dossierHeaderFacts">
        <div><dt>Decision basis</dt><dd>{String(scan.decision_reason || decisionExplanation(decision))}</dd></div>
        <div><dt>Required action</dt><dd>{nextAction}</dd></div>
        <div><dt>Artifact SHA-256</dt><dd><code>{String(scan.artifact_sha256 || "unavailable")}</code></dd></div>
        <div><dt>Scanned</dt><dd>{scannedAt}</dd></div>
      </dl>
      <DeepScanButton extensionId={id} version={version} showReportLink={false} />
      <ReportActions extensionId={id} version={version} scanId={scan.id} />
    </div>
  </header>;
}
