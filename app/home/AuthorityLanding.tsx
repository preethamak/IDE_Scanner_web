import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import ExtensionSearch from "@/app/ExtensionSearch";
import styles from "./authorityLanding.module.css";
import ReleaseReviewFilm from "./ReleaseReviewFilm";
import TrustProof from "./TrustProof";
import IdeCompatibility from "./IdeCompatibility";
import ExtensionSignalBoard from "./ExtensionSignalBoard";
import { getPublicInventory, type PublicInventoryItem } from "@/lib/productData";
import { decisionLabel } from "@/lib/dossierPresentation";

// A homepage example must link to a completed scan of the displayed package.
// When no report is available, show a search action rather than invented results.
export function selectPublicReview(items: PublicInventoryItem[]) {
  const complete = items.filter((item) => item.scan_id && item.extension_id &&
    item.version.trim() && !["latest", "unknown"].includes(item.version.trim().toLowerCase()) &&
    /^[a-f0-9]{64}$/i.test(item.artifact_sha256) && ["allow", "review", "block"].includes(item.decision) &&
    Number.isFinite(item.coverage_percent) && item.coverage_percent >= 0 && item.coverage_percent <= 100);
  return complete.find((item) => item.extension_id === "dbaeumer.vscode-eslint") || complete[0] || null;
}

export function publicReviewHref(item: PublicInventoryItem) {
  return `/extensions/${encodeURIComponent(item.extension_id)}/versions/${encodeURIComponent(item.version)}/scans/${encodeURIComponent(item.scan_id)}`;
}

export default async function AuthorityLanding() {
  const inventory = await getPublicInventory(8);
  const review = selectPublicReview(inventory.items);
  const reviewHref = review ? publicReviewHref(review) : "/registry";
  const outcome = review ? decisionLabel(review.decision) : "Analysis unavailable";
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Abscissa | Developer security environment for teams",
    description: "Abscissa helps teams review the extensions running in their editors, record approvals, and follow new versions from a shared workspace.",
    about: ["Developer security", "Team extension inventory", "Extension review", "Update monitoring"],
  };

  return <main className={`${styles.page} productLanding`}>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }} />
    <section className={`${styles.hero} productLandingHero`}>
      <div className={styles.heroTopline}>
        <span className={styles.heroKicker}><i /> Abscissa · Developer security environment</span>
        <span className={styles.heroIssue}>For your team <b>·</b> Starting with editor extensions</span>
      </div>
      <div className={`${styles.heroLayout} productLandingHeroGrid`}>
        <div className={`${styles.heroCopy} productLandingCopy`}>
          <h1>Know what runs in<em> your team’s editors.</em></h1>
          <p className={styles.heroLead}>Start with your team’s editor extensions. Review what they can access, decide which versions are allowed, and track new updates from one workspace.</p>
          <div className={styles.heroSearch}>
            <span className={styles.heroSearchLabel}>Search Marketplace / Open VSX</span>
            <ExtensionSearch submitLabel="Find extension" />
            <p className={styles.trialHint}>Five Deep Scans per 30 days. No account required.</p>
            <div className={styles.searchExamples} aria-label="Example extension searches">
              <span>Try:</span>{["GitHub Copilot", "Cline", "ESLint"].map((name) => <Link key={name} href={`/registry?q=${encodeURIComponent(name)}`}>{name}</Link>)}
            </div>
          </div>
          <div className={styles.actions}><Link className={styles.heroTextLink} href="/workspace">Open your workspace <ArrowUpRight /></Link><Link className={styles.heroTextLink} href="#how">Try a team review <ArrowRight /></Link></div>
        </div>
        <aside className={styles.reportExample} aria-label="Public extension report">
          <span className={styles.sectionKicker}>A published extension report</span>
          {review ? <>
            <h2>{review.display_name}</h2>
            <p><code>{review.extension_id}@{review.version}</code></p>
            <strong className={styles.exampleOutcome}>{outcome}</strong>
            <dl>
              <div><dt>Scan result</dt><dd>{review.decision_reason || "Read the scan results and what the analysis covers."}</dd></div>
              <div><dt>Executable files analyzed</dt><dd>{review.coverage_percent}%</dd></div>
              <div><dt>Package SHA-256</dt><dd><code className={styles.artifactHash}>{review.artifact_sha256}</code></dd></div>
            </dl>
            <p>This scan checks the package shown here. Your team records its own approval.</p>
            <Link href={reviewHref}>Read this version’s report <ArrowRight /></Link>
          </> : <>
            <h2>Start with a release your team uses.</h2>
            <p>No completed public report is available here right now. Search for an extension to see its scan status.</p>
            <Link href="/registry">Find an extension <ArrowRight /></Link>
          </>}
        </aside>
      </div>
      <nav className="productPath" aria-label="Abscissa team review steps">
        <span className="productPathLabel">From an installed extension to a team decision</span>
        <ol>
          <li className="isCurrent"><b>01</b><strong>Choose a release</strong><small>Find the extension and version in use.</small></li>
          <li><b>02</b><strong>Read the report</strong><small>Check file access, commands, and connections.</small></li>
          <li><b>03</b><strong>Record a decision</strong><small>Save who reviewed it and why.</small></li>
          <li><b>04</b><strong>Review the update</strong><small>Check changes against the version you approved.</small></li>
        </ol>
      </nav>
      <div className={`${styles.heroMovie} productLandingProof`}>
        <div className={styles.heroMovieMeta}><span>Product demo / reviewing an extension</span><span>Abscissa · 00:48</span></div>
        <div className={styles.heroMovieFrame}>
          <video autoPlay controls muted loop playsInline preload="metadata" poster="/demos/guardrails-product-overview-poster.jpg" aria-label="Abscissa extension review demo">
            <source src="/demos/guardrails-product-overview.mp4" type="video/mp4" />
            Your browser does not support video playback.
          </video>
          <div className={styles.heroMovieCaption}><span>Read the change, assign a reviewer, save a decision.</span><Link href="/demos">Open the full demo <ArrowUpRight /></Link></div>
        </div>
      </div>
    </section>

    <section className={styles.liveEvidence} aria-labelledby="live-evidence-heading">
      <div className={styles.liveHeader}>
        <div>
          <span className={styles.sectionKicker}>02 / The public view</span>
          <h2 id="live-evidence-heading">Start with<br /><em>an actual package.</em></h2>
        </div>
        <div className={styles.liveHeaderAside}><p>Read an extension report before creating a workspace. It shows what the scan found; your team decides whether that version belongs in your environment.</p><Link href="/registry">Browse the release index <ArrowRight /></Link></div>
      </div>
      <div className={styles.liveBoard}>
        <div className={styles.liveBoardLabel}><span>Live release index</span><span>{inventory.totals.releases.toLocaleString()} releases</span></div>
        <ExtensionSignalBoard items={inventory.items} total={inventory.totals.releases} />
      </div>
    </section>

    <section className={styles.trialCallout} aria-labelledby="trial-heading">
      <div className={styles.trialLead}>
        <span className={styles.sectionKicker}>03 / Start here</span>
        <h2 id="trial-heading">Five scans.<br /><em>No account required.</em></h2>
        <p>Try an extension scan before setting up your team. Public reports and the first five scans work without an account.</p>
      </div>
      <div className={styles.trialSteps} aria-label="Free scan details">
        <span><strong>01</strong><b>No card</b><small>Start from a public extension.</small></span>
        <span><strong>05</strong><b>Scans / 30 days</b><small>Start with any public extension.</small></span>
        <Link href="/registry">Start a free scan <ArrowRight /></Link>
      </div>
    </section>

    <section className={styles.demoSection} id="how" aria-labelledby="demo-heading">
      <div className={styles.demoIntro}>
        <span className={styles.sectionKicker}>04 / Review with your team</span>
        <h2 id="demo-heading">An extension updates.<br /><em>Your team reviews it.</em></h2>
        <p>See what changed from the approved version, assign someone to review it, and save the reason for the team’s decision.</p>
        <Link href="/workspace">Open the review inbox <ArrowUpRight /></Link>
      </div>
      <div className={styles.demoFilm}><ReleaseReviewFilm /></div>
    </section>

    <section className={styles.positioning} aria-labelledby="positioning-heading">
      <header className={styles.positioningHeader}>
        <div><span className={styles.sectionKicker}>Know what your team has approved</span><h2 id="positioning-heading">What did we approve,<em> and why?</em></h2></div>
        <p>Keep the extension version, its scan report, the reviewer, and the reason for approval together. When another teammate asks, the answer is already recorded.</p>
      </header>
      <div className={styles.positioningGrid}>
        <article><span>01 / Extension report</span><h3>Check what it can access</h3><p>Review file access, commands, network connections, and scan findings for the version you plan to use. See which parts could not be analyzed.</p><Link href={reviewHref}>Open a public report <ArrowUpRight /></Link></article>
        <article><span>02 / Team decision</span><h3>Save the team’s decision</h3><p>Assign a reviewer and record allow, block, or an exception with a reason. Other teammates can return to the report and decision.</p><Link href="/workspace">Open the team workspace <ArrowUpRight /></Link></article>
        <article><span>03 / Next update</span><h3>Review the next update</h3><p>Watch for new versions and compare them with the one your team reviewed. If either scan is missing or still running, you’ll see that status.</p><Link href="/monitor">Set up release monitoring <ArrowUpRight /></Link></article>
      </div>
      <div className={styles.positioningRead}><strong>What the scan covers</strong><p>The scanner inspects package files. It does not run the extension or guarantee its behaviour. Approval applies to the version your team reviewed.</p><Link href="/research">Inspect the methodology <ArrowRight /></Link></div>
      <nav className={styles.integrationLinks} aria-label="Connect extension reports to your tools">
        <span>Use reports from your existing tools</span>
        <Link href="/cli">GuardRails CLI <ArrowUpRight /></Link>
        <Link href="/badge">Reports, exports, and badges <ArrowUpRight /></Link>
        <Link href="/docs/mcp">MCP and API access <ArrowUpRight /></Link>
      </nav>
    </section>

    <section className={styles.researchLink}><p>Research note</p><div><h2>See how a suspicious extension was investigated.</h2><Link href="/research/solidity-pro">Read the Solidity Pro case study <ArrowUpRight /></Link></div></section>

    <section className={styles.teamSection} aria-labelledby="team-heading">
      <div className={styles.teamIntro}>
        <span className={styles.sectionKicker}>05 / For teams</span>
        <h2 id="team-heading">Bring your team’s extension reviews together.</h2>
        <p>Keep installed extensions, reviews, update checks, and decisions in the team workspace. Start with one extension your developers already use.</p>
        <Link href="/workspace">Open the team workspace <ArrowRight /></Link>
      </div>
      <div className={styles.teamGrid}>
        <article><span>01</span><h3>Review inbox</h3><p>Route new releases to the people who can decide.</p></article>
        <article><span>02</span><h3>Review history</h3><p>See who approved a version and the reason they recorded.</p></article>
        <article><span>03</span><h3>Release monitoring</h3><p>Check new versions of extensions the team uses.</p></article>
        <article><span>04</span><h3>Trust badges</h3><p>Share a link to the report for a reviewed version.</p></article>
      </div>
    </section>

    <IdeCompatibility />
    <TrustProof />
    <section className={styles.close}><span className={styles.sectionKicker}>Start with an extension your team uses</span><h2>Check the extension.<br /><em>Review it together.</em></h2><Link href="/registry">Check an extension <ArrowRight /></Link></section>
  </main>;
}
