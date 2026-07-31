import DossierSectionHead from "@/app/dossier/DossierSectionHead";
import type { ReportFinding, ReportScan } from "@/lib/reportContract";

export default function RawEvidenceSection({ scan, findings }: { scan: ReportScan; findings: ReportFinding[] }) {
  return <><DossierSectionHead eyebrow="Technical evidence" title="Raw scanner fields" detail="Manifests, hashes, and normalized JSON are available here so they do not compete with the decision summary." /><pre className="rawEvidence">{JSON.stringify({ scan, findings }, null, 2)}</pre></>;
}
