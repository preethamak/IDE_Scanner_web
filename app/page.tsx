import Image from "next/image";
import Link from "next/link";
import { unstable_cache } from "next/cache";
import { Activity, ArrowRight, ArrowUpRight, Bell, Box, Check, CheckCircle2, ChevronRight, Code2, FileCode2, Fingerprint, GitCompareArrows, LockKeyhole, MessageSquare, Network, PackageCheck, Radar, ScanSearch, ShieldCheck, TerminalSquare, Workflow } from "lucide-react";
import HomeSearch from "@/app/HomeSearch";
import BrandMark from "@/app/BrandMark";
import { resolveMarketplaceExtension } from "@/lib/marketplace";
import { getPublicSecurityFeed } from "@/lib/productData";
import { getPublicMetrics } from "@/lib/publicMetrics";

export const dynamic = "force-dynamic";
const featuredIds = ["ms-python.python", "PreethamAK.vyper-guard-vscode", "ms-vscode-remote.remote-containers", "tintinweb.vscode-vyper"];
const getFeatured = unstable_cache(async () => { const values = await Promise.allSettled(featuredIds.map(resolveMarketplaceExtension)); return values.flatMap((value) => value.status === "fulfilled" ? [value.value] : []); }, ["guardrails-home-featured"], { revalidate: 21600 });

export default async function HomePage() {
  const [extensions, feed, metrics] = await Promise.all([getFeatured(), getPublicSecurityFeed(8), getPublicMetrics()]);
  const selected = feed[0];
  return <main className="productHome">
    <section className="productHero">
      <div className="heroIntro">
        <span className="systemLabel"><i/> EXTENSION INTELLIGENCE / EVIDENCE</span>
        <h1>Understand every extension<br/>before you trust it.</h1>
        <p>GuardRails makes the extension result clear before it reaches your workspace.</p>
        <HomeSearch/>
        <div className="heroFinePrint"><span><Check/> Public reports are free</span><span><Check/> Static analysis only</span><span><Check/> Exact SHA-256 boundary</span></div>
        <div className="heroIntelCard vyperReportCard" aria-label="Vyper Guard 0.0.2 validation report">
          <header><span><i/> VALIDATED REPORT</span><code>2026.07.15</code></header>
          <div className="heroArtifact"><Image src="/extensions/vyper-guard.png" alt="Vyper Guard logo" width={44} height={44}/><div><small>PREETHAMAK.VYPER-GUARD-VSCODE</small><strong>Vyper Guard</strong><code>@0.0.2 · SHA-256 f4145dde…8a77</code></div><b>REVIEW</b></div>
          <div className="vyperReportSummary"><p>No malware behavior was found in the exact Marketplace VSIX or controlled runtime test. Review remains required until the trust-boundary weaknesses are fixed.</p><div><article><span>SEVERITY</span><strong>MEDIUM</strong></article><article><span>MALWARE</span><strong>0</strong></article><article><span>RISK</span><strong>57</strong></article><article><span>COVERAGE</span><strong>100%</strong></article></div></div>
          <div className="vyperFindingList"><article><TerminalSquare/><div><strong>Workspace executable can be replaced</strong><small>Confirmed in hostile configuration testing</small></div></article><article><FileCode2/><div><strong>Report output and SARIF paths need bounds</strong><small>Arbitrary output and diagnostic paths were accepted</small></div></article><article><Network/><div><strong>Real CLI run made 0 network attempts</strong><small>No canary reads or unexpected writes observed</small></div></article></div>
          <Link href="/scan?q=PreethamAK.vyper-guard-vscode"><span>READ REPORT</span><div><strong>Evidence, limitations, and remediation</strong><small>Exact artifact · controlled runtime validation</small></div><ArrowRight/></Link>
        </div>
      </div>

      <div className="productConsole" aria-label="GuardRails report preview">
        <header className="consoleTopbar"><div><BrandMark compact/><strong>GuardRails</strong><span>/ REPORT PREVIEW</span></div><nav><span className="active">Overview</span><span>Evidence</span><span>Files</span><span>Release changes</span></nav><Link href={selected ? `/extensions/${encodeURIComponent(selected.extension_id)}/versions/${encodeURIComponent(selected.version)}` : "/catalog"}>Open full report <ArrowUpRight/></Link></header>
        <div className="consoleBody">
          <aside className="consoleRail"><span className="railHeading">RECENTLY ANALYZED</span>{feed.slice(0, 5).map((item, index) => <Link className={index === 0 ? "selected" : ""} href={`/extensions/${encodeURIComponent(item.extension_id)}/versions/${encodeURIComponent(item.version)}`} key={`${item.extension_id}@${item.version}`}><i className={`stateDot ${item.decision}`}/><div><strong>{item.display_name}</strong><code>@{item.version}</code></div><ChevronRight/></Link>)}</aside>
          <section className="consoleMain">
            <div className="artifactBar"><div className="artifactIcon"><Code2/></div><div><span>EXACT MARKETPLACE ARTIFACT</span><h2>{selected?.display_name || "GitHub Copilot"}</h2><code>{selected?.extension_id || "GitHub.copilot"}@{selected?.version || "1.388.0"}</code></div><span className={`consoleDecision ${selected?.decision || "review"}`}>{String(selected?.decision || "review").toUpperCase()}</span></div>
            <div className="consoleSummary"><div><span>POLICY OUTCOME</span><strong>{selected?.decision_reason || "Decision-relevant behavior needs context before approval."}</strong></div><div className="coverageDial"><span>ANALYSIS COVERAGE</span><strong>{selected?.coverage_percent ?? 100}%</strong><i><b style={{ width: `${selected?.coverage_percent ?? 100}%` }}/></i></div></div>
            <div className="consoleEvidence"><header><span>DECISION-RELEVANT EVIDENCE</span><span>GROUPED / NO DUPLICATE NOISE</span></header><article><span className="evidenceIcon"><TerminalSquare/></span><div><strong>Process and workspace access</strong><p>Review executable behavior against the extension’s documented purpose.</p></div><span className="evidenceTag">REVIEW</span></article><article><span className="evidenceIcon"><PackageCheck/></span><div><strong>Supply-chain components</strong><p>Dependencies, native payloads, and artifact provenance remain inspectable.</p></div><span className="evidenceTag neutral">CONTEXT</span></article><article><span className="evidenceIcon"><Fingerprint/></span><div><strong>Immutable artifact identity</strong><p>Every result is bound to one registry, version, hash, build, and ruleset.</p></div><CheckCircle2 className="evidenceCheck"/></article></div>
          </section>
          <aside className="consoleContext"><div><span>ARTIFACT IDENTITY</span><code>Exact SHA-256 recorded</code></div><div><span>SCANNER</span><strong>Static / deterministic</strong></div><div><span>PACKAGE EXECUTION</span><strong className="good">Never</strong></div><Link href="/catalog"><ShieldCheck/> Browse extensions <ArrowUpRight/></Link></aside>
        </div>
      </div>
    </section>

    <section className="proofTicker"><span>PUBLIC DATASET</span><strong>{formatMetric(metrics.exact_releases_analyzed)} exact releases</strong><i/><strong>{formatMetric(metrics.analyzer_complete_reports)} complete reports</strong><i/><strong>{formatMetric(metrics.known_bad_artifacts)} known-bad matches</strong><div>{extensions.map((item) => <Link href={`/extensions/${encodeURIComponent(item.extension_id)}`} title={item.display_name} key={item.extension_id}>{item.icon_url ? <Image src={item.icon_url} width={27} height={27} alt={item.display_name} unoptimized/> : <Box/>}</Link>)}</div></section>

    <section className="productNarrative">
      <header><span>ONE CONTINUOUS WORKFLOW</span><h2>The scan is only the beginning.</h2><p>Most tools stop at a report. GUARDRAILS keeps the artifact, evidence, release history, and response in one operational timeline.</p></header>
      <div className="workflowConsole">
        <aside><span>WORKFLOW</span><a className="active"><ScanSearch/> Before install <b>01</b></a><a><GitCompareArrows/> Release change <b>02</b></a><a><Bell/> Team alert <b>03</b></a><a><CheckCircle2/> Decision history <b>04</b></a></aside>
        <div className="workflowStage"><header><span>BEFORE INSTALLATION</span><span>Vyper Guard@0.0.2</span></header><div className="workflowQuestion"><small>GUARDRAILS / RECOMMENDATION</small><h3>Review before this artifact enters the environment.</h3><p>Controlled testing found no malware behavior, but workspace configuration can replace the executable and redirect report output.</p><div><Link href="/scan?q=PreethamAK.vyper-guard-vscode">Review evidence <ArrowRight/></Link><span><i/> 100% coverage</span></div></div><div className="workflowTrace"><span>ARTIFACT FLOW</span><div><b><PackageCheck/> Registry</b><i/><b><FileCode2/> Artifact</b><i/><b><ShieldCheck/> Policy</b><i/><b><CheckCircle2/> Decision</b></div></div></div>
        <aside className="workflowFacts"><div><span>WHY IT MATTERS</span><strong>Capabilities are expected. Unexplained changes are not.</strong><p>GUARDRAILS separates power from proof so legitimate developer tools are not mislabeled as malware.</p></div><div><span>BOUNDARY</span><code>SHA-256<br/>ed18caf3…be19</code></div></aside>
      </div>
    </section>

    <section className="monitorShowcase">
      <header><div><span><i/> CONTINUOUS MONITORING</span><h2>Every new release becomes a reviewable event.</h2></div><Link href="/monitor">Configure Monitor <ArrowUpRight/></Link></header>
      <div className="monitorConsole">
        <aside><BrandMark/><strong>GUARDRAILS</strong><nav><span><Radar/> Overview</span><span className="active"><Bell/> Alerts <b>3</b></span><span><Workflow/> Monitors</span><span><GitCompareArrows/> Changes</span></nav><small>SECURITY WORKSPACE</small></aside>
        <div className="monitorCanvas"><header><div><span>ALERT INBOX</span><strong>3 events need a decision</strong></div><button>All extensions <ChevronRight/></button></header><div className="monitorStats"><span><small>OPEN</small><strong>3</strong></span><span><small>NEW RELEASES</small><strong>2</strong></span><span><small>INCOMPLETE</small><strong>1</strong></span><span><small>RESOLVED / 30D</small><strong>18</strong></span></div><div className="monitorTable"><header><span>EVENT</span><span>EXTENSION</span><span>CHANGE</span><span>STATE</span><span/></header><article><i className="alertAmber"/><div><strong>Release analysis complete</strong><small>Evidence is ready for review</small></div><code>Vyper Guard</code><span>CLI access</span><b>NEW</b><ArrowUpRight/></article><article><i className="alertLime"/><div><strong>Decision changed</strong><small>Coverage restored after re-scan</small></div><code>ms-python.python</code><span>Incomplete → Review</span><b>OPEN</b><ArrowUpRight/></article><article><i className="alertRed"/><div><strong>Analysis incomplete</strong><small>Required artifact coverage is missing</small></div><code>remote-containers</code><span>2 providers</span><b>OPEN</b><ArrowUpRight/></article></div></div>
      </div>
      <div className="deliveryStrip"><span>DELIVER THE SIGNAL</span><b><Bell/> In-product</b><b><MessageSquare/> Slack</b><b><Activity/> Severity threshold</b><b><Workflow/> Acknowledge / dismiss</b></div>
    </section>

    <section className="evidenceSectionHome">
      <div className="evidenceCopy"><span>TRUST IS INSPECTABLE</span><h2>Evidence first.<br/>Claims second.</h2><p>Reports retain exact identity, analyzer coverage, grouped findings, affected files, and the ruleset that produced the result.</p><Link href="/benchmark">Read validation evidence <ArrowRight/></Link></div>
      <div className="benchmarkPanel"><header><span>FROZEN DEVELOPMENT CORPUS</span><strong>30 exact VSIX artifacts</strong></header><div><article><span>UNTOUCHED PASS</span><strong>23/30</strong><i><b style={{width:"76.7%"}}/></i><small>artifacts completed</small></article><article><span>FINAL REGRESSION</span><strong>30/30</strong><i><b style={{width:"100%"}}/></i><small>artifacts completed</small></article><article><span>LEGITIMATE BLOCKS</span><strong>0</strong><i/><small>after documented fixes</small></article></div><footer><LockKeyhole/><p>Development-regression evidence. Not an ecosystem accuracy or malware-recall claim.</p></footer></div>
    </section>

    <section className="productClosing"><BrandMark/><span>GUARDRAILS</span><h2>Check the extension.<br/>Keep watching the release.</h2><HomeSearch/><div><Link href="/catalog">Explore extensions</Link><Link href="/monitor">Set up monitoring</Link></div></section>
  </main>;
}

function formatMetric(value: number | null) { return value == null ? "0" : new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value); }
