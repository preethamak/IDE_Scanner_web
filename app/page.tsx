import Image from "next/image";
import Link from "next/link";
import { unstable_cache } from "next/cache";
import { ArrowRight, ArrowUpRight, BellRing, Box, Check, CheckCircle2, Eye, Fingerprint, RefreshCw, ScanSearch, ShieldCheck, TriangleAlert } from "lucide-react";
import HomeSearch from "@/app/HomeSearch";
import BrandMark from "@/app/BrandMark";
import { resolveMarketplaceExtension } from "@/lib/marketplace";
import { getPublicSecurityFeed } from "@/lib/productData";
import { getPublicMetrics } from "@/lib/publicMetrics";

export const dynamic = "force-dynamic";
const featuredIds = ["ms-python.python", "PreethamAK.vyper-guard-vscode", "ms-vscode-remote.remote-containers", "tintinweb.vscode-vyper"];
const getFeatured = unstable_cache(async () => { const values = await Promise.allSettled(featuredIds.map(resolveMarketplaceExtension)); return values.flatMap((value) => value.status === "fulfilled" ? [value.value] : []); }, ["guardrails-home-featured"], { revalidate: 21600 });

const alertTone: Record<string, string> = { review: "review", block: "block", incomplete: "review" };
const verdictCopy: Record<string, { label: string; tone: string }> = {
  review: { label: "Take a look first", tone: "review" },
  block: { label: "Don't install", tone: "block" },
  incomplete: { label: "Not fully checked", tone: "incomplete" },
  allow: { label: "Looks clean", tone: "allow" },
};

export default async function HomePage() {
  const [extensions, feed, metrics] = await Promise.all([getFeatured(), getPublicSecurityFeed(8), getPublicMetrics()]);
  const verdict = verdictCopy.review;

  return <main className="lp">
    {/* ---------------------------------------------------------------- HERO */}
    <section className="lpHero">
      <span className="lpKicker"><i/> Extension safety, in plain language</span>
      <h1>Know what an extension does before you install it.</h1>
      <p>Paste any VS Code extension and GuardRails gives you a clear, readable answer — safe, worth a look, or best avoided.</p>
      <div className="lpSearchWrap"><HomeSearch/></div>
      <div className="lpExamples">
        <span>Try:</span>
        <Link href="/catalog?q=ms-python.python">ms-python.python</Link>
        <Link href="/catalog?q=GitHub.copilot">GitHub.copilot</Link>
        <Link href="/catalog?q=PreethamAK.vyper-guard-vscode">Vyper Guard</Link>
      </div>
      <div className="lpHeroChips">
        <span><Check/> Public reports are free</span>
        <span><Check/> We never run the extension</span>
        <span><Check/> Checked against the exact download</span>
      </div>
    </section>

    {/* ----------------------------------------------------------- SAFETY CARD */}
    <section className="lpShowcase">
      <div className="lpCard" aria-label="Example extension safety report">
        <div className="lpCardTop">
          <Image src="/extensions/vyper-guard.png" alt="Vyper Guard logo" width={52} height={52}/>
          <div className="lpCardId"><small>PREETHAMAK.VYPER-GUARD-VSCODE</small><strong>Vyper Guard</strong></div>
          <span className={`lpVerdict ${verdict.tone}`}><Eye/> {verdict.label}</span>
        </div>
        <div className="lpCardBody">
          <p>We didn&apos;t find any malware in this version — but the extension can replace a program in your project folder and write files to paths it shouldn&apos;t. Worth reviewing before you trust it.</p>
          <div className="lpMeter">
            <div className="lpMeterHead"><span>How risky</span><b>57 / 100</b></div>
            <div className="lpMeterTrack"><i style={{ width: "57%", background: "var(--lp-review)" }}/></div>
          </div>
          <ul className="lpChecks">
            <li><span className="lpCheckIcon ok"><CheckCircle2/></span><div><strong>No malware behaviour</strong><small>Nothing malicious in the exact Marketplace download or a live test run.</small></div></li>
            <li><span className="lpCheckIcon ok"><CheckCircle2/></span><div><strong>Stayed offline</strong><small>Made zero network requests during the controlled test.</small></div></li>
            <li><span className="lpCheckIcon warn"><TriangleAlert/></span><div><strong>Can touch your workspace</strong><small>A hostile project setup could swap the executable it runs.</small></div></li>
          </ul>
        </div>
        <div className="lpCardFoot">
          <span>Based on the exact file, version 0.0.2</span>
          <Link href="/scan?q=PreethamAK.vyper-guard-vscode">See the full report <ArrowRight/></Link>
        </div>
      </div>
    </section>

    {/* --------------------------------------------------------------- PROOF */}
    <section className="lpProof">
      <div className="lpProofStat"><strong>{formatMetric(metrics.exact_releases_analyzed)}</strong><span>Exact releases checked</span></div>
      <div className="lpProofStat"><strong>{formatMetric(metrics.analyzer_complete_reports)}</strong><span>Complete reports</span></div>
      <div className="lpProofStat"><strong>{formatMetric(metrics.known_bad_artifacts)}</strong><span>Known-bad matches</span></div>
      <div className="lpProofIcons">{extensions.map((item) => <Link href={`/extensions/${encodeURIComponent(item.extension_id)}`} title={item.display_name} key={item.extension_id}>{item.icon_url ? <Image src={item.icon_url} width={25} height={25} alt={item.display_name} unoptimized/> : <Box/>}</Link>)}</div>
    </section>

    {/* --------------------------------------------------------- HOW IT WORKS */}
    <section className="lpSection">
      <div className="lpSectionHead">
        <span className="lpKicker"><i/> How it works</span>
        <h2>Three steps to a clear answer.</h2>
        <p>No security background needed. Search, read the verdict, decide.</p>
      </div>
      <div className="lpSteps">
        <article className="lpStep"><div className="lpStepNum"><ScanSearch/></div><h3>1 · Search it</h3><p>Type an extension name or its publisher ID. We pull the exact file from the Marketplace.</p></article>
        <article className="lpStep"><div className="lpStepNum"><Eye/></div><h3>2 · Read the verdict</h3><p>A plain-language summary tells you what it can do and whether anything looks off.</p></article>
        <article className="lpStep"><div className="lpStepNum"><ShieldCheck/></div><h3>3 · Decide with proof</h3><p>Every claim links to the evidence behind it, so you can install with confidence.</p></article>
      </div>
    </section>

    {/* ------------------------------------------------------------ FEATURES */}
    <section className="lpSection" style={{ paddingTop: 0 }}>
      <div className="lpSectionHead">
        <span className="lpKicker"><i/> Why people trust it</span>
        <h2>Honest answers, not scare tactics.</h2>
        <p>Powerful extensions do powerful things. We tell you what&apos;s expected and what isn&apos;t.</p>
      </div>
      <div className="lpFeatures">
        <article className="lpFeature"><div className="lpFeatureIcon"><Fingerprint/></div><h3>Checked to the exact file</h3><p>Every result is tied to one version and its SHA-256 fingerprint — never a guess from the description.</p></article>
        <article className="lpFeature"><div className="lpFeatureIcon"><ShieldCheck/></div><h3>We never run it</h3><p>Analysis is static and read-only. Nothing from the extension ever executes on your machine or ours.</p></article>
        <article className="lpFeature"><div className="lpFeatureIcon"><Eye/></div><h3>Evidence you can open</h3><p>Behind every verdict sits the findings, affected files, and the rules that produced it. Nothing hidden.</p></article>
      </div>
    </section>

    {/* ------------------------------------------------------------- MONITOR */}
    <section className="lpSection lpMonitor" style={{ paddingTop: 0 }}>
      <div className="lpMonitorCopy">
        <span className="lpKicker"><i/> Stay in the loop</span>
        <h2>Get told when a trusted extension changes.</h2>
        <p>Extensions update quietly. GuardRails re-checks every new release and pings you only when something actually needs a decision.</p>
        <Link className="lpLink" href="/monitor">Set up monitoring <ArrowRight/></Link>
      </div>
      <div className="lpAlerts">
        <header><strong>Recent alerts</strong><span><i/> {feed.length} need a look</span></header>
        {feed.slice(0, 4).map((item) => {
          const tone = alertTone[item.decision] || "review";
          return <div className="lpAlertRow" key={`${item.extension_id}@${item.version}`}>
            <span className={`lpAlertIcon ${tone}`}>{tone === "block" ? <TriangleAlert/> : <BellRing/>}</span>
            <div><strong>{item.display_name}</strong><small>{shorten(item.decision_reason)}</small></div>
            <code>@{item.version}</code>
          </div>;
        })}
      </div>
    </section>

    {/* ------------------------------------------------------------- CLOSING */}
    <section className="lpClosing">
      <div className="lpClosingBrand"><BrandMark/><strong>GuardRails</strong></div>
      <h2>Check an extension now.</h2>
      <p>It&apos;s free, and you&apos;ll get an answer you can actually read.</p>
      <div className="lpSearchWrap"><HomeSearch/></div>
      <div className="lpClosingLinks">
        <Link href="/catalog">Browse extensions</Link>
        <Link href="/monitor">Set up monitoring</Link>
        <Link href="/benchmark">See our validation</Link>
      </div>
    </section>
  </main>;
}

function shorten(value: string) { return value.length > 68 ? `${value.slice(0, 66)}…` : value; }
function formatMetric(value: number | null) { return value == null ? "0" : new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value); }
