import Image from "next/image";
import Link from "next/link";
import { unstable_cache } from "next/cache";
import { Activity, ArrowRight, BellRing, Box, Braces, CheckCircle2, Eye, FileCode2, Fingerprint, GitCompareArrows, Orbit, Radar, Search, ShieldCheck, Sparkles, Terminal, Waypoints } from "lucide-react";
import HomeSearch from "@/app/HomeSearch";
import { resolveMarketplaceExtension } from "@/lib/marketplace";
import { getPublicSecurityFeed } from "@/lib/productData";
import { getPublicMetrics } from "@/lib/publicMetrics";

export const dynamic = "force-dynamic";

const featuredIds = ["ms-python.python", "GitHub.copilot", "ms-vscode-remote.remote-containers", "tintinweb.vscode-vyper"];
const getFeatured = unstable_cache(async () => { const values = await Promise.allSettled(featuredIds.map(resolveMarketplaceExtension)); return values.flatMap((value) => value.status === "fulfilled" ? [value.value] : []); }, ["home-featured-v3"], { revalidate: 21600 });

export default async function HomePage() {
  const [extensions, feed, metrics] = await Promise.all([getFeatured(), getPublicSecurityFeed(8), getPublicMetrics()]);
  const reviewed = feed.filter((item) => item.decision === "review").length;
  const incomplete = feed.filter((item) => item.decision === "incomplete").length;
  return <main className="nextHome">
    <section className="commandHero">
      <div className="heroGlow heroGlowOne"/><div className="heroGlow heroGlowTwo"/>
      <div className="commandHeroCopy">
        <div className="betaLine"><span><i/> Live public intelligence</span><Link href="/benchmark">See how it is validated <ArrowRight/></Link></div>
        <h1>Know the extension.<br/><em>Before it knows you.</em></h1>
        <p>Inspect the exact code, capabilities, dependencies, and release changes entering developer machines—then keep watching after approval.</p>
        <HomeSearch/>
        <div className="heroTrust"><span><ShieldCheck/> Static analysis</span><span><Fingerprint/> Exact artifact hash</span><span><Eye/> Public reports</span></div>
      </div>
      <div className="heroCockpit" aria-label="Live IDE Scanner product preview">
        <div className="cockpitTop"><div><span className="liveDot"/> LIVE INTELLIGENCE</div><span>RULESET 2026.07.16</span></div>
        <div className="cockpitIdentity"><div className="cockpitIcon">{extensions[1]?.icon_url ? <Image src={extensions[1].icon_url} alt="" width={48} height={48} unoptimized/> : <Braces/>}</div><div><small>GITHUB.COPILOT</small><strong>GitHub Copilot</strong><code>@1.388.0</code></div><span className="outcomePill review">REVIEW NEEDED</span></div>
        <div className="cockpitMap"><div className="accessCore"><Radar/><span>EXTENSION</span></div><span className="orbitNode nodeCode"><Braces/><b>Source</b></span><span className="orbitNode nodeTerminal"><Terminal/><b>Process</b></span><span className="orbitNode nodeNetwork"><Waypoints/><b>Network</b></span><span className="orbitNode nodeFiles"><FileCode2/><b>Files</b></span></div>
        <div className="cockpitEvidence"><article><span>Outcome</span><strong>Manual review</strong><i className="bar amber"/></article><article><span>Coverage</span><strong>100%</strong><i className="bar green"/></article><article><span>Exact files</span><strong>60</strong><i className="bar blue"/></article></div>
        <div className="cockpitFinding"><span>MEDIUM</span><div><strong>Native artifacts need provenance review</strong><small>17 affected files · exact evidence available</small></div><ArrowRight/></div>
        <Link className="cockpitAction" href="/extensions/GitHub.copilot/versions/1.388.0">Open the real report <ArrowRight/></Link>
      </div>
    </section>

    <section className="extensionMarquee" aria-label="Supported extension intelligence"><span>Inspect any published extension</span><div>{extensions.map((item) => <Link href={`/extensions/${encodeURIComponent(item.extension_id)}`} key={item.extension_id}>{item.icon_url ? <Image src={item.icon_url} width={34} height={34} alt="" unoptimized/> : <Box/>}<strong>{item.display_name}</strong><small>{formatCount(item.install_count)} installs</small></Link>)}</div></section>

    <section className="homeIntelligence">
      <header><div><span className="sectionKicker"><Activity/> RECENT INTELLIGENCE</span><h2>What changed across the ecosystem.</h2><p>Real completed scans. No invented threat feed and no popularity-based safety claims.</p></div><Link href="/catalog">Explore all extensions <ArrowRight/></Link></header>
      <div className="intelligenceLayout"><div className="intelligenceFeed">{feed.slice(0, 5).map((item) => <Link href={`/extensions/${encodeURIComponent(item.extension_id)}/versions/${encodeURIComponent(item.version)}`} key={`${item.extension_id}@${item.version}`}><span className={`signalDot ${item.decision}`}/><div><small>{item.decision === "incomplete" ? "ANALYSIS INCOMPLETE" : item.decision === "block" ? "DO NOT INSTALL" : "REVIEW NEEDED"}</small><strong>{item.display_name}</strong><code>{item.extension_id}@{item.version}</code></div><p>{item.decision_reason}</p><span className="coverageMini">{item.coverage_percent}%<i style={{ width: `${item.coverage_percent}%` }}/></span><ArrowRight/></Link>)}</div><aside className="ecosystemPanel"><div className="ecosystemOrb"><Orbit/><strong>{formatMetric(metrics.exact_releases_analyzed)}</strong><span>exact releases analyzed</span></div><div className="ecosystemStats"><article><strong>{reviewed}</strong><span>recent reviews</span></article><article><strong>{incomplete}</strong><span>incomplete</span></article><article><strong>{formatMetric(metrics.known_bad_artifacts)}</strong><span>known-bad matches</span></article><article><strong>{formatMetric(metrics.analyzer_complete_reports)}</strong><span>complete reports</span></article></div><Link href="/benchmark">Validation evidence <ArrowRight/></Link></aside></div>
    </section>

    <section className="productModules"><header><span className="sectionKicker"><Sparkles/> ONE CONTINUOUS WORKFLOW</span><h2>From first look to every release after.</h2></header><div>
      <article className="moduleCard moduleInspect"><div className="moduleIndex">01</div><div><span>BEFORE INSTALL</span><h3>Inspect the exact artifact.</h3><p>Move from publisher identity to the package that will actually run. Search files, open verified source, and follow evidence to its location.</p><Link href="/catalog">Explore intelligence <ArrowRight/></Link></div><div className="moduleVisual codeVisual"><header><i/><i/><i/><code>extension/dist/index.js</code></header><pre><b>214</b>  const child = spawn(binary, args);{`\n`}<b>215</b>  child.stdout.pipe(output);{`\n`}<mark><b>216</b>  return vscode.window.withProgress(...);</mark></pre><span><Search/> Evidence-linked source</span></div></article>
      <article className="moduleCard moduleCompare"><div className="moduleIndex">02</div><div><span>ON EVERY CHANGE</span><h3>See the release delta.</h3><p>Compare two immutable scans across findings, capabilities, dependencies, and files. If evidence is missing, the product says so.</p><Link href="/extensions/GitHub.copilot/versions/1.388.0#changes">Open a comparison <ArrowRight/></Link></div><div className="moduleVisual diffVisual"><div><span>1.387</span><ArrowRight/><span>1.388</span></div><article className="added"><b>+</b><span>3 dependencies</span></article><article className="changed"><b>~</b><span>12 files changed</span></article><article className="neutral"><CheckCircle2/><span>No new capability family</span></article></div></article>
      <article className="moduleCard moduleMonitor"><div className="moduleIndex">03</div><div><span>AFTER APPROVAL</span><h3>Return only when it matters.</h3><p>Watch extensions, detect new releases, queue analysis, and triage the evidence change from one private workspace.</p><Link href="/monitor">Start monitoring <ArrowRight/></Link></div><div className="moduleVisual monitorVisual"><header><BellRing/><div><strong>Release intelligence</strong><span>3 events this week</span></div></header><article><i className="signalDot review"/><div><strong>New release analyzed</strong><span>GitHub Copilot @1.388.0</span></div><small>NOW</small></article><article><i className="signalDot incomplete"/><div><strong>Coverage needs attention</strong><span>Required analyzer incomplete</span></div><small>2H</small></article></div></article>
    </div></section>

    <section className="homeProof"><div><span className="sectionKicker">TRUSTED BY INSPECTION</span><h2>Every conclusion has a boundary.</h2><p>Exact hashes, recorded scanner builds, provider coverage, grouped evidence, and a benchmark that publishes what it cannot prove.</p><div><Link className="button buttonLight" href="/benchmark">Read validation evidence</Link><Link className="textLinkLight" href="/settings">Analysis boundaries <ArrowRight/></Link></div></div><aside><div><Fingerprint/><span>Artifact identity</span><strong>SHA-256 pinned</strong></div><div><Radar/><span>Scanner identity</span><strong>Build recorded</strong></div><div><ShieldCheck/><span>Coverage</span><strong>Provider visible</strong></div><div><GitCompareArrows/><span>Regression</span><strong>Limits published</strong></div></aside></section>

    <section className="closingSearch"><Radar/><span>START WITH AN EXTENSION</span><h2>What are you about to install?</h2><p>Public reports are free. No account required.</p><HomeSearch/></section>
  </main>;
}

function formatCount(value: number) { return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value || 0); }
function formatMetric(value: number | null) { return value == null ? "0" : new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value); }
