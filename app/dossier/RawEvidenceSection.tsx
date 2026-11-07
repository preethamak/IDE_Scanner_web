import DossierSectionHead from "@/app/dossier/DossierSectionHead";
import type { ReportFinding, ReportScan } from "@/lib/reportContract";

export default function RawEvidenceSection({ scan, findings }: { scan: ReportScan; findings: ReportFinding[] }) {
  return <><DossierSectionHead eyebrow="Scanner data" title="Raw scanner fields" detail="Inspect the scanner’s stored fields and findings as JSON." /><pre className="rawEvidence">{JSON.stringify({ scan, findings }, null, 2)}</pre></>;
}
