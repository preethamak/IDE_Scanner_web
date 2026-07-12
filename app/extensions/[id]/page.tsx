import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { BadgeCheck, Box, CalendarDays, ChevronRight, Download, GitBranch, ShieldCheck } from "lucide-react";
import { getExtensionProduct } from "@/lib/productData";
import DeepScanButton from "@/app/DeepScanButton";

export const dynamic = "force-dynamic";

export default async function ExtensionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getExtensionProduct(decodeURIComponent(id));
  if (!product) notFound();
  const latest = product.versions.find((item) => item.is_latest) || product.versions[0];
  const version = String(latest?.version || product.extension.latest_version || "unknown");
  const scan = product.scan;
  const decision = String(scan?.decision || "not assessed");
  return <main className="productPage">
    <section className="packageHeader">
      <div className="packageIdentity">
        <span className="packageIcon">{product.extension.icon_url ? <Image src={product.extension.icon_url} alt="" width={74} height={74} unoptimized/> : product.extension.publisher.slice(0, 2).toUpperCase()}</span>
        <div><div className="registryLine"><span>{product.extension.registry === "openvsx" ? "Open VSX" : "VS Marketplace"}</span><ChevronRight size={13}/><code>{product.extension.id}</code></div><h1>{product.extension.display_name}</h1><p>{product.extension.description}</p></div>
      </div>
      <div className="packageActions"><DeepScanButton extensionId={product.extension.id} version={version}/><a className="button buttonQuiet" href={`vscode:extension/${product.extension.id}`}>Install <Download size={16}/></a></div>
    </section>

    <section className="packageFacts">
      <div><span>Decision</span><strong className={`decision ${decision === "not assessed" ? "neutral" : decision}`}>{decision.toUpperCase()}</strong></div>
      <div><span>Latest version</span><strong>{version}</strong></div>
      <div><span>Publisher</span><strong>{product.extension.publisher}{product.extension.publisher_verified ? <BadgeCheck size={15}/> : null}</strong></div>
      <div><span>Installs</span><strong>{formatCount(product.extension.installs)}</strong></div>
      <div><span>Last release</span><strong>{formatDate(product.extension.last_published_at)}</strong></div>
      <div><span>Deep Scan</span><strong>{latest?.scan_state === "complete" ? "Complete" : "Available on request"}</strong></div>
    </section>

    <nav className="packageTabs" aria-label="Extension intelligence"><a href="#overview">Overview</a><a href="#versions">Versions <b>{product.versions.length}</b></a><a href="#trust">Trust model</a><a href="#about">About</a></nav>

    <div className="packageLayout">
      <div className="packageMain">
        <section id="overview" className="productSection"><div className="productSectionHead"><span>Current release</span><h2>{scan ? installHeadline(decision) : "This version has not received a Deep Scan yet."}</h2><p>{scan ? String(scan.decision_reason || "Review the recorded evidence before installation.") : "Registry identity is known, but behavior, dependencies, files and analyzer coverage remain unassessed until the exact artifact is scanned."}</p></div>{scan ? <div className="overviewDecision"><ShieldCheck size={22}/><div><strong>Decision applies only to {product.extension.id}@{version}</strong><span>Artifact <code>{String(scan.artifact_sha256 || "hash unavailable").slice(0, 18)}</code> · ruleset {String(scan.ruleset_version || "unknown")}</span></div></div> : <div className="unassessedBand"><Box size={21}/><div><strong>Registry metadata is not a security scan.</strong><p>Request a Deep Scan to inspect executable entrypoints, Semgrep paths, YARA indicators, dependencies and artifact integrity.</p></div></div>}</section>

        <section id="versions" className="productSection"><div className="productSectionHead compact"><span>Release history</span><h2>Published versions</h2><p>Each decision belongs to an immutable version and artifact hash.</p></div><div className="versionTable"><div className="versionHead"><span>Version</span><span>Published</span><span>Analysis</span><span/></div>{product.versions.map((item) => <div className="versionRow" key={String(item.version)}><strong>{String(item.version)}</strong><span>{formatDate(item.published_at ? String(item.published_at) : null)}</span><span className={`scanState ${String(item.scan_state || "not_scanned")}`}>{String(item.scan_state || "not scanned").replaceAll("_", " ")}</span><Link href={`/extensions/${encodeURIComponent(product.extension.id)}/versions/${encodeURIComponent(String(item.version))}`}>Open <ChevronRight size={15}/></Link></div>)}</div></section>

        <section id="trust" className="productSection"><div className="productSectionHead compact"><span>Trust boundaries</span><h2>What identity can and cannot prove</h2></div><div className="trustRows"><article><BadgeCheck/><div><strong>Publisher identity</strong><p>{product.extension.publisher_verified ? "The registry reports a verified publisher." : "The registry does not report a verified publisher."} Verification does not prove artifact behavior.</p></div></article><article><GitBranch/><div><strong>Version-specific analysis</strong><p>Future releases can add new permissions, dependencies or executable behavior. Reassess every artifact change.</p></div></article><article><CalendarDays/><div><strong>Release context</strong><p>Popularity and maintenance help establish context but never override malicious or correlated evidence.</p></div></article></div></section>
      </div>
      <aside className="packageAside" id="about"><div><span>Package</span><dl><dt>Identifier</dt><dd><code>{product.extension.id}</code></dd><dt>Registry</dt><dd>{product.extension.registry}</dd><dt>Rating</dt><dd>{product.extension.rating || "Not reported"}</dd><dt>Repository</dt><dd>{product.extension.repository_url ? <a href={product.extension.repository_url}>Open source</a> : "Not declared"}</dd></dl></div><div><span>Analysis promise</span><p>No extension code is executed. A completed Deep Scan records exact provider coverage and becomes incomplete when a required analyzer fails.</p><Link href="/metrics">Read the methodology <ChevronRight size={14}/></Link></div></aside>
    </div>
  </main>;
}

function installHeadline(decision: string): string { return decision === "allow" ? "No evidence crossed the active review policy." : decision === "block" ? "Do not install this exact artifact." : decision === "incomplete" ? "Do not approve until analysis coverage is restored." : "Review the highlighted behavior before installation."; }
function formatCount(value: number): string { return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value); }
function formatDate(value: string | null): string { if (!value) return "Unknown"; const date = new Date(value); return Number.isNaN(date.valueOf()) ? value : new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(date); }
