import ExtensionIdentity from "@/app/ExtensionIdentity";
import ReportActions from "@/app/ReportActions";
import { displayedDecision } from "@/lib/classificationContract";
import { decisionExplanation, decisionLabel } from "@/lib/dossierPresentation";
import type { ExtensionDossierData } from "@/lib/reportContract";

type Props = Pick<ExtensionDossierData, "id" | "version" | "extension" | "scan">;

export default function DossierHeader({ id, version, extension, scan }: Props) {
  const decision = displayedDecision(scan);
  const nextAction = decision === "allow" ? "Proceed under normal extension controls" : decision === "block" ? "Do not install this version" : decision === "review" ? "Record a team decision before approval" : "Wait for complete analysis";
  return <header className="dossierMast">
    <ExtensionIdentity
      size="lg"
      eyebrow="Analysis Report"
      id={id}
      version={version}
      name={extension.display_name}
      iconUrl={extension.icon_url}
      publisher={extension.publisher}
      verified={extension.publisher_verified}
    />
    <div className={`dossierDecision ${decision}`}>
      <span>Scan result</span>
      <strong>{decisionLabel(decision)}</strong>
      <p>{String(scan.decision_reason || decisionExplanation(decision))}</p>
      <dl className="dossierHeaderFacts">
        <div><dt>Required action</dt><dd>{nextAction}</dd></div>
      </dl>
      <ReportActions extensionId={id} version={version} scanId={scan.id} />
    </div>
  </header>;
}
