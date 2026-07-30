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
      <DeepScanButton extensionId={id} version={version} showReportLink={false} />
      <ReportActions extensionId={id} version={version} scanId={scan.id} />
    </div>
  </header>;
}
