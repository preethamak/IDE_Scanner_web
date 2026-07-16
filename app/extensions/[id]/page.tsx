import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, Box, CalendarDays, ChevronRight, Download, GitBranch, ShieldCheck } from "lucide-react";
import { getExtensionProduct } from "@/lib/productData";
import DeepScanButton from "@/app/DeepScanButton";
import WatchExtension from "@/app/WatchExtension";
import ExtensionIcon from "@/app/ExtensionIcon";

export const dynamic = "force-dynamic";

export default async function ExtensionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getExtensionProduct(decodeURIComponent(id));
  if (!product) notFound();
  const latest = product.versions.find((item) => item.is_latest) || product.versions[0];
  const version = String(latest?.version || product.extension.latest_version || "unknown");
  const scan = product.scan;
  const decision = decisionState(scan?.decision);
  return <main className="productPage">
    <section className="packageHeader">
      <div className="packageIdentity">
        <ExtensionIcon iconUrl={product.extension.icon_url} publisher={product.extension.publisher} name={product.extension.display_name} size="lg"/>
        <div><div className="registryLine"><span>{product.extension.registry === "openvsx" ? "Open VSX" : "VS Marketplace"}</span><ChevronRight size={13}/><code>{product.extension.id}</code></div><h1>{product.extension.display_name}</h1><p>{product.extension.description}</p></div>
      </div>
      <div className="packageActions">{scan ? <><Link className="button buttonDark" href={`/extensions/${encodeURIComponent(product.extension.id)}/versions/${encodeURIComponent(version)}`}>Read Deep Scan report</Link><DeepScanButton extensionId={product.extension.id} version={version} showReportLink={false}/></> : <DeepScanButton extensionId={product.extension.id} version={version}/>}<a className="button buttonQuiet" href={`vscode:extension/${product.extension.id}`}>Install <Download size={16}/></a></div>
    </section>

    <section className="packageFacts">
      <div><span>Install decision</span><strong className={`decision severityBadge ${decision}`}>{decisionLabel(decision)}</strong></div>
      <div><span>Latest version</span><strong>{version}</strong></div>
      <div><span>Publisher</span><strong>{product.extension.publisher}{product.extension.publisher_verified ? <BadgeCheck size={15}/> : null}</strong></div>
      <div><span>Installs</span><strong>{formatCount(product.extension.installs)}</strong></div>
      <div><span>Last release</span><strong>{formatDate(product.extension.last_published_at)}</strong></div>
      <div><span>Deep Scan</span><strong>{latest?.scan_state === "complete" ? "Complete" : "Available on request"}</strong></div>
      <div><span>Analysis coverage</span><strong>{scan ? `${Number(scan.coverage_percent ?? 0)}%` : "Not assessed"}</strong></div>
      <div><span>Last analyzed</span><strong>{scan ? formatDate(String(scan.scanned_at || "")) : "Not assessed"}</strong></div>
    </section>

    <nav className="packageTabs" aria-label="Extension profile"><a href="#overview">Overview</a><a href="#versions">Versions <b>{product.versions.length}</b></a>{scan ? <Link href={`/extensions/${encodeURIComponent(product.extension.id)}/versions/${encodeURIComponent(version)}`}>Full report</Link> : null}<a href="#trust">Trust</a></nav>

    <div className="packageLayout">
      <div className="packageMain">
        <section id="overview" className="productSection"><div className="productSectionHead"><span>Current release</span><h2>{scan ? decisionHeadline(decision) : "Deep analysis has not run for this release."}</h2><p>{scan ? String(scan.decision_reason || "Review the recorded evidence before installation.") : "Publisher, adoption and release information remain available below. Behavior and artifact-level security fields will appear after the exact version completes Deep Scan."}</p></div>{scan ? <div className="overviewDecision"><ShieldCheck size={22}/><div><strong>Analysis applies only to {product.extension.id}@{version}</strong><span>Artifact <code>{String(scan.artifact_sha256 || "hash unavailable").slice(0, 18)}</code> · ruleset {String(scan.ruleset_version || "unknown")}</span></div></div> : <div className="unassessedBand"><Box size={21}/><div><strong>Artifact analysis pending</strong><p>Select Deep Scan to inspect entrypoints, Semgrep paths, YARA indicators, dependencies and artifact integrity without executing extension code.</p></div></div>}</section>

        <section id="versions" className="productSection"><div className="productSectionHead compact"><span>Release history</span><h2>Published versions</h2><p>Each decision belongs to an immutable version and exact artifact hash.</p></div><div className="versionTable"><div className="versionHead"><span>Version</span><span>Published</span><span>Decision</span><span/></div>{product.versions.map((item) => { const versionDecision = decisionState(item.decision); return <div className="versionRow" key={String(item.version)}><strong>{String(item.version)}</strong><span>{formatDate(item.published_at ? String(item.published_at) : null)}</span><span className={`scanState decisionState ${versionDecision}`}>{versionDecision === "not-assessed" ? "NOT ANALYZED" : decisionLabel(versionDecision)}</span><Link href={`/extensions/${encodeURIComponent(product.extension.id)}/versions/${encodeURIComponent(String(item.version))}`}>Open <ChevronRight size={15}/></Link></div>; })}</div></section>

        <section id="trust" className="productSection"><div className="productSectionHead compact"><span>Trust boundaries</span><h2>What identity can and cannot prove</h2></div><div className="trustRows"><article><BadgeCheck/><div><strong>Publisher identity</strong><p>{product.extension.publisher_verified ? "The registry reports a verified publisher." : "The registry does not report a verified publisher."} Verification does not prove artifact behavior.</p></div></article><article><GitBranch/><div><strong>Version-specific analysis</strong><p>Future releases can add new permissions, dependencies or executable behavior. Reassess every artifact change.</p></div></article><article><CalendarDays/><div><strong>Release context</strong><p>Popularity and maintenance help establish context but never override malicious or correlated evidence.</p></div></article></div></section>
      </div>
      <aside className="packageAside" id="about"><div><span>Package</span><dl><dt>Identifier</dt><dd><code>{product.extension.id}</code></dd><dt>Registry</dt><dd>{product.extension.registry}</dd><dt>Rating</dt><dd>{product.extension.rating || "Not reported"}</dd><dt>Repository</dt><dd>{product.extension.repository_url ? <a href={product.extension.repository_url}>Open source</a> : "Not declared"}</dd></dl></div><div><span>Analysis promise</span><p>No extension code is executed. A completed Deep Scan records exact provider coverage and becomes incomplete when a required analyzer fails.</p><Link href="/metrics">Read the methodology <ChevronRight size={14}/></Link></div><div><span>Monitoring</span><p>Watch this extension to review future release changes from your workspace.</p><WatchExtension extensionId={product.extension.id}/></div></aside>
    </div>
  </main>;
}

function decisionState(value: unknown): "allow" | "review" | "block" | "incomplete" | "not-assessed" { const decision = String(value || "").toLowerCase(); return ["allow", "review", "block", "incomplete"].includes(decision) ? decision as "allow" | "review" | "block" | "incomplete" : "not-assessed"; }
function decisionLabel(value: ReturnType<typeof decisionState>): string { return value === "allow" ? "ALLOW" : value === "review" ? "REVIEW" : value === "block" ? "BLOCK" : value === "incomplete" ? "INCOMPLETE" : "NOT ANALYZED"; }
function decisionHeadline(value: ReturnType<typeof decisionState>): string { return value === "allow" ? "No evidence currently requires review." : value === "review" ? "Review decision-relevant behavior before installation." : value === "block" ? "This exact artifact should not be installed." : value === "incomplete" ? "Analysis must complete before an approval decision." : "Analysis has not assigned an install decision yet."; }
function formatCount(value: number): string { return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value); }
function formatDate(value: string | null): string { if (!value) return "Unknown"; const date = new Date(value); return Number.isNaN(date.valueOf()) ? value : new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(date); }
