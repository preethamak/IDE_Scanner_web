import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BellRing,
  CircleCheck,
  Eye,
  PackageSearch,
  RefreshCw,
} from "lucide-react";
import BrandMark from "@/app/BrandMark";
import HomeSearch from "@/app/HomeSearch";
import {
  CredibilityStory,
  HeroProductScene,
  ProductWalkthrough,
} from "@/app/HomeProductShowcase";
import { getPublicSecurityFeed } from "@/lib/productData";
import styles from "./home.module.css";

export const dynamic = "force-dynamic";

const popularSearches = [
  ["GitHub Copilot", "GitHub.copilot"],
  ["Continue", "Continue.continue"],
  ["Cline", "saoudrizwan.claude-dev"],
  ["Code Runner", "formulahendry.code-runner"],
  ["ESLint", "dbaeumer.vscode-eslint"],
  ["Docker", "ms-azuretools.vscode-docker"],
] as const;

export default async function HomePage() {
  const feed = await getPublicSecurityFeed(8);
  const recent = feed[0] || null;

  return <main className={styles.home}>
    <section className={styles.hero}>
      <div className={styles.heroGlow} aria-hidden="true" />
      <div className={styles.heroCopy}>
        <span className={styles.kicker}><i /> Extension Security</span>
        <h1>The security check before you click Install.</h1>
        <p className={styles.heroLead}>Downloads and ratings tell you what&apos;s popular. GuardRails shows you what you&apos;re installing—before it reaches your editor.</p>
        <div className={styles.heroSearch}>
          <HomeSearch />
        </div>
        <div className={styles.popularSearches} aria-label="Popular extension searches">
          <span>Popular searches</span>
          <div>
            {popularSearches.map(([label, query]) => <Link key={query} href={`/analyze?q=${encodeURIComponent(query)}`}>{label}</Link>)}
          </div>
        </div>
      </div>
      <HeroProductScene item={recent} />
    </section>

    <CredibilityStory />

    <section className={styles.productSection} id="how-it-works">
      <header className={styles.sectionIntro}>
        <span className={styles.kicker}><i /> See the product</span>
        <h2>See the extension behind the listing.</h2>
        <p>GuardRails turns an extension package into a decision you can understand. Start with the answer, then open the evidence when you need it.</p>
      </header>
      <ProductWalkthrough item={recent} />
    </section>

    <section className={styles.changeSection}>
      <div className={styles.changeCopy}>
        <span className={styles.kicker}><i /> Releases change</span>
        <h2>The name stays the same. The behavior may not.</h2>
        <p>GuardRails keeps the previous release in view, so a meaningful new capability does not disappear inside an ordinary update notification.</p>
        <Link className={styles.textLink} href="/compare">Compare extension releases <ArrowRight /></Link>
      </div>
      <div className={styles.releaseCompare} aria-label="Illustration of capabilities changing between extension releases">
        <div className={styles.compareHeader}>
          <span>Release comparison</span>
          <small>Illustrative change view</small>
        </div>
        <div className={styles.releaseColumns}>
          <article>
            <header><span>Version 1.3</span><small>Previously reviewed</small></header>
            <ul><li><CircleCheck /> Reads project files</li><li><CircleCheck /> Provides editor commands</li></ul>
          </article>
          <div className={styles.changeArrow} aria-hidden="true"><ArrowRight /></div>
          <article className={styles.latestRelease}>
            <header><span>Version 1.4</span><small>New release</small></header>
            <ul><li><CircleCheck /> Reads project files</li><li><RefreshCw /> Runs terminal commands <b>New</b></li><li><RefreshCw /> Opens network connections <b>New</b></li></ul>
          </article>
        </div>
      </div>
    </section>

    <section className={styles.riskSection}>
      <div className={styles.riskHeading}>
        <span className={styles.kicker}><i /> Why check first</span>
        <h2>The marketplace grew. So did the reasons to look closer.</h2>
        <p>Most extensions are useful. The scale of the ecosystem simply makes downloads and ratings an incomplete security signal.</p>
      </div>
      <div className={styles.detectionStory} aria-label="VS Code malware detections increased from 27 to 105 in the first ten months of 2025">
        <header><span>VS Code malware detections</span><small>First 10 months of 2025</small></header>
        <div className={styles.detectionBars}>
          <div><strong>27</strong><i className={styles.barBefore} /><span>Earlier count</span></div>
          <div><strong>105</strong><i className={styles.barAfter} /><span>Later count</span></div>
        </div>
        <p>Nearly <strong>4×</strong> in ten months</p>
      </div>
      <div className={styles.incidentConclusion}>
        <span>And one incident reached</span>
        <strong>1.5 million</strong>
        <p>installs across two AI extensions reported to be silently exfiltrating source code.</p>
        <div className={styles.sourceLinks}>Sources <a href="https://www.koi.ai/blog/2-6-exposing-malicious-extensions-shocking-statistics-from-the-vs-code-marketplace" target="_blank" rel="noopener noreferrer">Koi Security</a><a href="https://www.reversinglabs.com/blog/malicious-vs-code-fake-image" target="_blank" rel="noopener noreferrer">ReversingLabs</a><a href="https://thehackernews.com/2026/01/malicious-vs-code-ai-extensions-with-15.html" target="_blank" rel="noopener noreferrer">The Hacker News</a></div>
      </div>
    </section>

    <section className={styles.recentSection}>
      <div className={styles.recentHeading}>
        <span className={styles.kicker}><i /> From public analysis</span>
        <h2>A result worth opening.</h2>
        <p>One current GuardRails result, tied to the analyzed release—not a fictional marketing alert.</p>
      </div>
      {recent ? <article className={styles.recentFinding}>
        <div className={styles.recentMeta}>
          <span className={styles.findingPulse} aria-hidden="true" />
          <span>Recent finding</span>
          <time dateTime={recent.scanned_at}>{formatDate(recent.scanned_at)}</time>
        </div>
        <div className={styles.recentBody}>
          <div><small>{recent.extension_id}</small><h3>{recent.display_name}</h3><code>@{recent.version}</code></div>
          <p>{recent.decision_reason}</p>
          <Link href={`/extensions/${encodeURIComponent(recent.extension_id)}/versions/${encodeURIComponent(recent.version)}/scans/${encodeURIComponent(recent.scan_id)}`}>View exact report <ArrowUpRight /></Link>
        </div>
      </article> : <div className={styles.feedEmpty}>
        <Eye />
        <div><strong>Public analysis is being refreshed.</strong><p>Search an extension above to explore the current intelligence catalog.</p></div>
        <Link href="/registry">Open Extension Registry <ArrowRight /></Link>
      </div>}
    </section>

    <section className={styles.monitorSection}>
      <div className={styles.monitorCopy}>
        <span className={styles.kicker}><i /> Keep watching</span>
        <h2>The first check is only the beginning.</h2>
        <p>When a new release changes what an extension can do, GuardRails brings that decision back into view.</p>
        <Link className={styles.textLink} href="/monitor">Explore monitoring <ArrowRight /></Link>
      </div>
      <div className={styles.activityPanel}>
        <header><div><BellRing /><strong>Security feed</strong></div><span><i /> Live public results</span></header>
        <div className={styles.activityList}>
          {feed.slice(0, 4).map((item) => <Link className={styles.activityRow} href={`/extensions/${encodeURIComponent(item.extension_id)}/versions/${encodeURIComponent(item.version)}/scans/${encodeURIComponent(item.scan_id)}`} key={`${item.scan_id}-${item.extension_id}`}>
            <span className={styles.activityMark}><PackageSearch /></span>
            <span><strong>{item.display_name}</strong><small>{shorten(item.decision_reason, 82)}</small></span>
            <code>@{item.version}</code>
            <ArrowUpRight />
          </Link>)}
          {!feed.length ? <div className={styles.activityEmpty}>No public review results are available right now.</div> : null}
        </div>
      </div>
    </section>

    <section className={styles.closing}>
      <div className={styles.closingBrand}><BrandMark /><strong>GuardRails</strong></div>
      <h2>Make every extension a decision—not a guess.</h2>
      <p>Search public extension intelligence before the next install, then keep watching what changes.</p>
      <div className={styles.closingActions}>
        <Link className={styles.primaryButton} href="/analyze">Check an extension <ArrowRight /></Link>
        <Link className={styles.secondaryButton} href="/registry">Browse Analysis Reports <ArrowUpRight /></Link>
      </div>
    </section>
  </main>;
}

function shorten(value: string, limit: number) {
  return value.length > limit ? `${value.slice(0, limit - 1)}…` : value;
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Latest analysis" : new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(date);
}
