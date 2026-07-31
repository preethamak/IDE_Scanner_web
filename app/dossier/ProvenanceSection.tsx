import DossierSectionHead from "@/app/dossier/DossierSectionHead";
import type { ReportScan } from "@/lib/reportContract";

export default function ProvenanceSection({ scan }: { scan: ReportScan }) {
  const artifacts = object(scan.artifacts);
  return <>
    <DossierSectionHead eyebrow="Provenance" title="Exact artifact identity" detail="This is the evidence boundary for the report. A publisher name or repository cannot substitute for it." />
    <div className="provenanceList">
      <Fact label="Artifact SHA-256" value={scan.artifact_sha256} />
      <Fact label="Scanner build" value={String(scan.scanner_build || "Not recorded")} />
      <Fact label="Ruleset" value={String(scan.ruleset_version || "Not recorded")} />
      <Fact label="Scanner profile" value={String(scan.profile || "deep")} />
      <Fact label="VSIX signature" value={artifacts.vsix_signature ? "Recorded in artifact evidence" : "Not reported"} />
    </div>
  </>;
}

function Fact({ label, value }: { label: string; value: string }) { return <article><span>{label}</span><strong>{value}</strong></article>; }
function object(value: unknown): Record<string, unknown> { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
