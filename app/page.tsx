import Link from "next/link";
import { ArrowRight, ArrowUpRight, BellRing, Eye, Fingerprint, PackageX, ShieldCheck, ShieldOff, TriangleAlert } from "lucide-react";
import BrandMark from "@/app/BrandMark";
import { HeroArt, ThreatArt } from "@/app/LandingArt";
import { getPublicSecurityFeed } from "@/lib/productData";

export const dynamic = "force-dynamic";

const alertTone: Record<string, string> = { review: "review", block: "block", incomplete: "review" };

export default async function HomePage() {
  const feed = await getPublicSecurityFeed(8);

  return <main className="lp">
    {/* ---------------------------------------------------------------- HERO */}
    <section className="lpHero lpHeroSplit">
      <div className="lpHeroCopy">
        <span className="lpKicker"><i/> Extension &amp; AI-assistant security</span>
        <h1>Every extension is code you didn&apos;t write, running where you work.</h1>
        <p>Developers install 40+ extensions on average — and most come from publishers no one has verified. GuardRails checks the exact code before it reaches your editor, and keeps watching after.</p>
        <div className="lpCta">
          <Link className="lpBtn" href="/scan">Check an extension <ArrowRight/></Link>
          <Link className="lpBtnGhost" href="#how">See how it works</Link>
        </div>
      </div>
      <div className="lpHeroArt"><HeroArt/></div>
    </section>

    {/* ------------------------------------------------------- PROBLEM / PROOF */}
    <section className="lpProblem">
      <div className="lpSectionHead">
        <span className="lpKicker"><i/> Why this matters</span>
        <h2>The marketplace was never built to be trusted.</h2>
        <p>The tools developers rely on every day have quietly become one of the softest targets in the supply chain.</p>
      </div>
      <div className="lpStats">
        <article className="lpStat"><strong>~60,000</strong><span>extensions in the marketplace — only <b>~1,800</b> from verified publishers.</span></article>
        <article className="lpStat lpStatAlarm"><strong>27&nbsp;→&nbsp;105</strong><span>malware detections on VS Code nearly <b>quadrupled</b> in the first 10 months of 2025.</span></article>
        <article className="lpStat"><strong>3.3&nbsp;billion</strong><span>installs across the marketplace — trust compounds with every one.</span></article>
        <article className="lpStat lpStatAlarm"><strong>1.5&nbsp;million</strong><span>installs on two AI extensions caught silently exfiltrating source code.</span></article>
      </div>
      <p className="lpSources">Sources: <a href="https://www.koi.ai/blog/2-6-exposing-malicious-extensions-shocking-statistics-from-the-vs-code-marketplace" target="_blank" rel="noopener">Koi Security</a> · <a href="https://www.reversinglabs.com/blog/malicious-vs-code-fake-image" target="_blank" rel="noopener">ReversingLabs</a> · <a href="https://thehackernews.com/2026/01/malicious-vs-code-ai-extensions-with-15.html" target="_blank" rel="noopener">The Hacker News</a></p>
    </section>

    {/* --------------------------------------------------------- THE ANSWER */}
    <section className="lpAnswer">
      <div className="lpAnswerArt">
        <ThreatArt/>
        <div className="lpAnswerBadge"><ShieldCheck/> 1 in 33 publishers is verified</div>
      </div>
      <div className="lpAnswerCopy">
        <span className="lpKicker"><i/> What GuardRails does</span>
        <h2>A clear outcome on the exact code — not the description.</h2>
        <p>Marketplace listings can be incomplete. GuardRails analyzes the precise file that would land on your machine, separates expected power from unexplained evidence, and records the boundary behind the result.</p>
        <ul className="lpAnswerList">
          <li><span className="lpDot allow"/><div><strong>Tied to the exact artifact</strong><small>Every outcome is bound to one version, SHA-256, scanner build, ruleset, and immutable report.</small></div></li>
          <li><span className="lpDot allow"/><div><strong>We never run the extension</strong><small>Analysis is static and read-only. Nothing executes on your machine or ours.</small></div></li>
          <li><span className="lpDot allow"/><div><strong>Evidence you can open</strong><small>Behind every claim: the findings, the files, and the rules that produced it.</small></div></li>
        </ul>
        <Link className="lpLink" href="/scan">Try it on any extension <ArrowRight/></Link>
      </div>
    </section>

    {/* --------------------------------------------------------- HOW IT WORKS */}
    <section className="lpSection" id="how">
      <div className="lpSectionHead">
        <span className="lpKicker"><i/> How it works</span>
        <h2>From name to evidence in three steps.</h2>
        <p>No security background required. Anyone on the team can read the answer.</p>
      </div>
      <div className="lpSteps">
        <article className="lpStep"><div className="lpStepNum"><PackageX/></div><h3>1 · Point us at it</h3><p>Give us an extension name or publisher ID. We pull the exact file straight from the marketplace.</p></article>
        <article className="lpStep"><div className="lpStepNum"><Eye/></div><h3>2 · Read the outcome</h3><p>A plain-language summary of expected capabilities, provenance, and anything unexplained.</p></article>
        <article className="lpStep"><div className="lpStepNum"><ShieldCheck/></div><h3>3 · Decide with proof</h3><p>Open the evidence behind every finding, then install with confidence or walk away.</p></article>
      </div>
    </section>

    {/* ------------------------------------------------------------ FEATURES */}
    <section className="lpSection" style={{ paddingTop: 0 }}>
      <div className="lpSectionHead">
        <span className="lpKicker"><i/> Built for people who ship</span>
        <h2>Made for developers, teams, and the people who protect them.</h2>
        <p>Powerful tools do powerful things. We separate what&apos;s expected from what isn&apos;t — no scare tactics.</p>
      </div>
      <div className="lpFeatures">
        <article className="lpFeature"><div className="lpFeatureIcon"><Fingerprint/></div><h3>Exact-artifact analysis</h3><p>One registry, one version, one hash. Results can&apos;t drift from what you&apos;ll actually install.</p></article>
        <article className="lpFeature"><div className="lpFeatureIcon"><ShieldOff/></div><h3>Zero execution, zero risk</h3><p>Static, deterministic analysis. GuardRails reads code — it never lets it run.</p></article>
        <article className="lpFeature"><div className="lpFeatureIcon"><Eye/></div><h3>Evidence, not vibes</h3><p>Findings, affected files, artifact hash, scanner build, and ruleset are always one click away.</p></article>
      </div>
    </section>

    {/* ------------------------------------------------------------- MONITOR */}
    <section className="lpSection lpMonitor" style={{ paddingTop: 0 }}>
      <div className="lpMonitorCopy">
        <span className="lpKicker"><i/> Stay in the loop</span>
        <h2>An approved extension today can change tomorrow.</h2>
        <p>Attackers push malicious code through updates and reused names. GuardRails re-checks every new release and alerts you only when something actually needs a decision.</p>
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
      <h2>Trust the extension. Then keep verifying it.</h2>
      <p>Free public reports. An answer any developer, team, or security engineer can act on.</p>
      <div className="lpCta">
        <Link className="lpBtn dark" href="/scan">Check an extension <ArrowRight/></Link>
        <Link className="lpBtnGhost dark" href="/catalog">Browse the catalog <ArrowUpRight/></Link>
      </div>
    </section>
  </main>;
}

function shorten(value: string) { return value.length > 68 ? `${value.slice(0, 66)}…` : value; }
