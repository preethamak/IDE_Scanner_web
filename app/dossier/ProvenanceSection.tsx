import DossierSectionHead from "@/app/dossier/DossierSectionHead";
import type { ReportScan } from "@/lib/reportContract";

export default function ProvenanceSection({ scan }: { scan: ReportScan }) {
  const artifacts = object(scan.artifacts);
  return <>
    <DossierSectionHead eyebrow="Scan details" title="Package and scanner details" detail="Use the package hash to identify the download that was scanned." />
    <div className="provenanceList">
      <Fact label="Package SHA-256" value={scan.artifact_sha256} />
      <Fact label="Scanner build" value={String(scan.scanner_build || "Not recorded")} />
      <Fact label="Ruleset" value={String(scan.ruleset_version || "Not recorded")} />
      <Fact label="Scanner profile" value={String(scan.profile || "deep")} />
      <Fact label="VSIX signature" value={artifacts.vsix_signature ? "Recorded by the scanner" : "Not reported"} />
    </div>
  </>;
}

function Fact({ label, value }: { label: string; value: string }) { return <article><span>{label}</span><strong>{value}</strong></article>; }
function object(value: unknown): Record<string, unknown> { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
