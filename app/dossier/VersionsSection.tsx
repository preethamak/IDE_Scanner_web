import DossierSectionHead from "@/app/dossier/DossierSectionHead";
import type { ReportVersion } from "@/lib/reportContract";

export default function VersionsSection({ versions, current }: { versions: ReportVersion[]; current: string }) {
  return <>
    <DossierSectionHead eyebrow="Release history" title="Published versions" detail="Each decision belongs to an immutable version and exact artifact hash." />
    <div className="dossierTable versionTable">
      <div><span>Version</span><span>Artifact scope</span><span>Decision</span><span /></div>
      {versions.map((item) => {
        const decision = versionDecision(item.decision);
        const isCurrent = item.version === current;
        return <article key={item.version} className={isCurrent ? "current" : ""}>
          <strong>{item.version}</strong><span>Exact version</span><span className={`decisionTechnical ${decision.toLowerCase().replaceAll(" ", "-")}`}>{decision}</span><span>{isCurrent ? "Current" : "Recorded"}</span>
        </article>;
      })}
    </div>
  </>;
}

function versionDecision(value: unknown) {
  const decision = String(value || "").toLowerCase();
  return decision === "allow" ? "ALLOW" : decision === "review" ? "REVIEW" : decision === "block" ? "BLOCK" : decision === "incomplete" ? "INCOMPLETE" : "NOT ANALYZED";
}
