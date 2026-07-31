import { BadgeCheck, FileCode2, Package, UserRound } from "lucide-react";
import DossierSectionHead from "@/app/dossier/DossierSectionHead";
import { selectPackagedReadme } from "@/lib/dossierPresentation";
import type { ReportExtension, ReportFile } from "@/lib/reportContract";

export default function PublisherSection({ extension, files }: { extension: ReportExtension; files: ReportFile[] }) {
  const readme = selectPackagedReadme(files);
  return <>
    <DossierSectionHead eyebrow="Package information" title="Publisher and package context" detail="Identity and popularity establish context. They do not override artifact evidence." />
    <div className="publisherGrid">
      <article><UserRound/><span>Publisher</span><strong>{extension.publisher}</strong><p>{extension.publisher_verified ? "Registry reports a verified publisher." : "Registry does not report publisher verification."}</p></article>
      <article><Package/><span>Package</span><strong>{extension.id}</strong><p>{extension.registry}</p></article>
      <article><BadgeCheck/><span>Marketplace context</span><strong>{Number(extension.installs || 0).toLocaleString()} installs</strong><p>Rating {String(extension.rating || "not reported")}</p></article>
      <article><FileCode2/><span>Documentation</span><strong>{readme ? "README packaged" : "README not packaged"}</strong><p>{String(extension.description || "No Marketplace description was reported.")}</p></article>
    </div>
  </>;
}
