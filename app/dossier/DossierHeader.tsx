import ExtensionIdentity from "@/app/ExtensionIdentity";
import ReportActions from "@/app/ReportActions";
import Link from "next/link";
import { GitCompareArrows } from "lucide-react";
import { displayedDecision } from "@/lib/classificationContract";
import { decisionExplanation, decisionLabel } from "@/lib/dossierPresentation";
import type { ExtensionDossierData } from "@/lib/reportContract";

type Props = Pick<ExtensionDossierData, "id" | "version" | "extension" | "scan"> & {
  fileCount: number;
  dependencyCount: number;
};

export default function DossierHeader({ id, version, extension, scan, fileCount, dependencyCount }: Props) {
  const decision = displayedDecision(scan);
  const nextAction = decision === "allow" ? "Proceed under normal extension controls" : decision === "block" ? "Resolve the policy flag for this version" : decision === "review" ? "Record a team decision before approval" : "Wait for complete analysis";
  const registry = String(extension.registry || "unknown").toLowerCase() === "openvsx" ? "Open VSX" : "VS Marketplace";
  const artifact = String(scan.artifact_sha256 || "Not reported");
  return <header className="dossierMast">
    <section className="dossierIdentityPanel">
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
      <p className="dossierIdentityContext">Completed analysis for this exact extension version. Use the summary below to decide what your team should do next.</p>
      <div className="dossierIdentityDetails" aria-label="Release details">
        <article><span>Publisher</span><strong>{extension.publisher || "Not reported"}</strong><small>{extension.publisher_verified ? "Verified marketplace identity" : "Marketplace identity"}</small></article>
        <article><span>Registry</span><strong>{registry}</strong><small>Published release source</small></article>
        <article><span>Package</span><strong>{fileCount} files</strong><small>{dependencyCount} dependencies</small></article>
        <article><span>Artifact</span><strong>{shortHash(artifact)}</strong><small>SHA-256 pinned</small></article>
      </div>
      <div className="dossierIdentityNote">
        <div><span>Decision memory</span><strong>One release. One defensible decision.</strong></div>
        <p>This report stays pinned to {version}. Future releases can be compared against it, but they never overwrite this evidence.</p>
        <div className="dossierIdentityNoteMeta"><span>Exact artifact retained</span><span>Next release compares here</span></div>
      </div>
    </section>
    <section className={`dossierDecision ${decision}`} aria-label="Security outcome">
      <span>Scan result</span>
      <strong>{decisionLabel(decision)}</strong>
      <p>{String(scan.decision_reason || decisionExplanation(decision))}</p>
      <dl className="dossierHeaderFacts">
        <div><dt>Required action</dt><dd>{nextAction}</dd></div>
      </dl>
      <div className="reportHeaderActions">
        <Link className="reportCompareAction" href={`/compare?extension=${encodeURIComponent(id)}&to=${encodeURIComponent(version)}`}>
          <GitCompareArrows aria-hidden="true" /> Compare releases
        </Link>
        <ReportActions extensionId={id} version={version} scanId={scan.id} />
      </div>
    </section>
  </header>;
}

function shortHash(value: string) {
  return value.length > 22 ? `${value.slice(0, 12)}…${value.slice(-8)}` : value;
}
