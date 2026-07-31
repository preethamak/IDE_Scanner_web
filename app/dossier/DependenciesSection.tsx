import DossierSectionHead from "@/app/dossier/DossierSectionHead";

export type DependencyRecord = Record<string, unknown>;

export default function DependenciesSection({ dependencies }: { dependencies: DependencyRecord[] }) {
  return <><DossierSectionHead eyebrow="Supply chain" title="Runtime dependencies" detail="Packages are tied to this exact artifact, not to the repository in general."/>{dependencies.length ? <div className="dossierTable"><div><span>Package</span><span>Version</span><span>Relationship</span><span>Advisories</span></div>{dependencies.map((item) => <article key={`${item.name}@${item.version}`}><strong>{String(item.name)}</strong><code>{String(item.version)}</code><span>{String(item.relationship || "runtime")}</span><span>{Array.isArray(item.advisories) ? item.advisories.length : 0}</span></article>)}</div> : <div className="dossierEmpty"><p>No runtime dependencies were reported for this artifact.</p></div>}</>;
}
