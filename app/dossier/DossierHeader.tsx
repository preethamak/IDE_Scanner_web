import ExtensionIdentity from "@/app/ExtensionIdentity";
import ReportActions from "@/app/ReportActions";
import Link from "next/link";
import { ArrowDown } from "lucide-react";
import { displayedDecision } from "@/lib/classificationContract";
import { decisionExplanation, decisionLabel } from "@/lib/dossierPresentation";
import type { ExtensionDossierData } from "@/lib/reportContract";

type Props = Pick<ExtensionDossierData, "id" | "version" | "extension" | "scan">;

export default function DossierHeader({ id, version, extension, scan }: Props) {
  const decision = displayedDecision(scan);
  const registry = String(extension.registry || "unknown").toLowerCase() === "openvsx" ? "Open VSX" : "VS Marketplace";
  const nextTask = decision === "allow" ? "Monitor this release" : "Review findings";
  return <header className="dossierMast">
    <section className="dossierIdentityPanel">
      <ExtensionIdentity size="lg" eyebrow="Extension release report" id={id} version={version} name={extension.display_name} iconUrl={extension.icon_url} publisher={extension.publisher} verified={extension.publisher_verified} />
      <h1 className="reportTitle">{extension.display_name || id} <span>{version}</span></h1>
      <p className="dossierIdentityContext">{registry} · {extension.publisher || "Publisher not reported"}</p>
    </section>
    <section className={`dossierDecision ${decision}`} aria-label="Security outcome">
      <span>Scan result · {decisionLabel(decision)}</span>
      <strong>{decision === "allow" ? "No findings require review" : decision === "review" ? "Review flagged behavior" : decision === "block" ? "This version was flagged" : decisionLabel(decision)}</strong>
      <p>{String(scan.decision_reason || decisionExplanation(decision))}</p>
      <a className="button buttonDark" href={decision === "allow" ? "#report-workflow" : "#alerts"}>{nextTask} <ArrowDown size={15} aria-hidden="true" /></a>
    </section>
    <div className="reportHeaderActions">
      <Link className="button buttonQuiet" href={`/compare?extension=${encodeURIComponent(id)}&to=${encodeURIComponent(version)}&toScanId=${encodeURIComponent(String(scan.id || ""))}`}>Compare releases</Link>
      <ReportActions extensionId={id} version={version} scanId={scan.id} mode="utilities" />
    </div>
  </header>;
}
