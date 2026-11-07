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

// Only an addressable exact artifact can stand in for the product on the homepage.
// An empty publication remains an empty state, never an invented security result.
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
    name: "GuardRails | IDE extension intelligence",
    description: "GuardRails helps developers and security teams inspect exact IDE extension releases, monitor meaningful changes, and keep evidence attached to software decisions.",
    about: ["IDE extension security", "software supply-chain risk", "release monitoring", "developer tooling"],
  };

  return <main className={`${styles.page} productLanding`}>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }} />
    <section className={`${styles.hero} productLandingHero`}>
      <div className={styles.heroTopline}>
        <span className={styles.heroKicker}><i /> For teams reviewing VS Code extensions</span>
        <span className={styles.heroIssue}>Exact release <b>·</b> Team decision</span>
      </div>
      <div className={`${styles.heroLayout} productLandingHeroGrid`}>
        <div className={`${styles.heroCopy} productLandingCopy`}>
          <h1>Review extension releases.<em> Keep the decision.</em></h1>
          <p className={styles.heroLead}>Inspect the published VS Code package, record why your team allows or blocks that version, and review the next update against the evidence you kept.</p>
          <div className={styles.heroSearch}>
            <span className={styles.heroSearchLabel}>Search Marketplace / Open VSX</span>
            <ExtensionSearch submitLabel="Find extension" />
            <p className={styles.trialHint}>Five Deep Scans per 30 days. No account required.</p>
            <div className={styles.searchExamples} aria-label="Example extension searches">
              <span>Try:</span>{["GitHub Copilot", "Cline", "ESLint"].map((name) => <Link key={name} href={`/registry?q=${encodeURIComponent(name)}`}>{name}</Link>)}
            </div>
          </div>
          <div className={styles.actions}><Link className={styles.heroTextLink} href="/workspace">Open a team review <ArrowUpRight /></Link><Link className={styles.heroTextLink} href="#how">Try the review workflow <ArrowRight /></Link></div>
        </div>
        <aside className={styles.reportExample} aria-label="Public exact-release evidence">
          <span className={styles.sectionKicker}>From the public scan corpus</span>
          {review ? <>
            <h2>{review.display_name}</h2>
            <p><code>{review.extension_id}@{review.version}</code></p>
            <strong className={styles.exampleOutcome}>{outcome}</strong>
            <dl>
              <div><dt>Evidence</dt><dd>{review.decision_reason || "Open the package evidence and analysis limits."}</dd></div>
              <div><dt>Executable-file coverage</dt><dd>{review.coverage_percent}%</dd></div>
              <div><dt>Artifact SHA-256</dt><dd><code className={styles.artifactHash}>{review.artifact_sha256}</code></dd></div>
            </dl>
            <p>Scanner evidence for this artifact. Your team records its approval separately.</p>
            <Link href={reviewHref}>Inspect this exact release <ArrowRight /></Link>
          </> : <>
            <h2>Start with a release your team uses.</h2>
            <p>A verified public artifact is not available in this preview. Search for a package to inspect its current scan status.</p>
            <Link href="/registry">Find an extension <ArrowRight /></Link>
          </>}
        </aside>
      </div>
      <nav className="productPath" aria-label="GuardRails review path">
        <span className="productPathLabel">The review record</span>
        <ol>
          <li className="isCurrent"><b>01</b><strong>Choose a release</strong><small>Pin the package, version, and scan.</small></li>
          <li><b>02</b><strong>Inspect evidence</strong><small>Check capabilities, findings, and gaps.</small></li>
          <li><b>03</b><strong>Record a decision</strong><small>Keep the reviewer, reason, and evidence.</small></li>
          <li><b>04</b><strong>Review the update</strong><small>Compare it with the retained baseline.</small></li>
        </ol>
      </nav>
      <div className={`${styles.heroMovie} productLandingProof`}>
        <div className={styles.heroMovieMeta}><span>Product film / release review</span><span>GuardRails · 00:48</span></div>
        <div className={styles.heroMovieFrame}>
          <video autoPlay controls muted loop playsInline preload="metadata" poster="/demos/guardrails-product-overview-poster.jpg" aria-label="GuardRails product demo">
            <source src="/demos/guardrails-product-overview.mp4" type="video/mp4" />
            Your browser does not support video playback.
          </video>
          <div className={styles.heroMovieCaption}><span>From a new capability to a saved decision.</span><Link href="/demos">Open the full demo <ArrowUpRight /></Link></div>
        </div>
      </div>
    </section>

    <section className={styles.liveEvidence} aria-labelledby="live-evidence-heading">
      <div className={styles.liveHeader}>
        <div>
          <span className={styles.sectionKicker}>02 / The public view</span>
          <h2 id="live-evidence-heading">Start with<br /><em>an actual package.</em></h2>
        </div>
        <div className={styles.liveHeaderAside}><p>Open public package evidence before creating a workspace. A scan result describes the analyzed artifact; a team approval is a separate record.</p><Link href="/registry">Browse the release index <ArrowRight /></Link></div>
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
        <p>Inspect the package, capabilities, and evidence before you decide whether GuardRails belongs in your workflow.</p>
      </div>
      <div className={styles.trialSteps} aria-label="Free scan details">
        <span><strong>01</strong><b>No card</b><small>Start from a public extension.</small></span>
        <span><strong>05</strong><b>Scans / 30 days</b><small>Start with any public extension.</small></span>
        <Link href="/registry">Start a free scan <ArrowRight /></Link>
      </div>
    </section>

    <section className={styles.demoSection} id="how" aria-labelledby="demo-heading">
      <div className={styles.demoIntro}>
        <span className={styles.sectionKicker}>04 / The review surface</span>
        <h2 id="demo-heading">A release arrives.<br /><em>The decision stays.</em></h2>
        <p>Compare the new capability against the approved baseline, inspect the evidence, and save the context for the next release.</p>
        <Link href="/workspace">Build a review workflow <ArrowUpRight /></Link>
      </div>
      <div className={styles.demoFilm}><ReleaseReviewFilm /></div>
    </section>

    <section className={styles.positioning} aria-labelledby="positioning-heading">
      <header className={styles.positioningHeader}>
        <div><span className={styles.sectionKicker}>One review, from package to receipt</span><h2 id="positioning-heading">What did we approve,<em> and why?</em></h2></div>
        <p>The useful output is a release-specific review record: the package evidence, the person who decided, and the reason the next reviewer can revisit.</p>
      </header>
      <div className={styles.positioningGrid}>
        <article><span>01 / Package evidence</span><h3>Inspect the exact release</h3><p>Open the version, artifact hash, observed capabilities, findings, and coverage limits. Missing evidence stays visible.</p><Link href={reviewHref}>Open a public report <ArrowUpRight /></Link></article>
        <article><span>02 / Team decision</span><h3>Leave a review receipt</h3><p>Assign a reviewer and record allow, block, or an exception with a reason. The approval belongs to the team, not the scanner.</p><Link href="/workspace">Open the team workspace <ArrowUpRight /></Link></article>
        <article><span>03 / Next update</span><h3>Revisit the baseline</h3><p>Monitor the extension and compare the next available release evidence. Pending scans and unavailable baselines remain explicit.</p><Link href="/monitor">Set up release monitoring <ArrowUpRight /></Link></article>
      </div>
      <div className={styles.positioningRead}><strong>Product boundary</strong><p>Static package evidence supports a human review. It cannot guarantee runtime safety or approve future versions.</p><Link href="/research">Inspect the methodology <ArrowRight /></Link></div>
      <nav className={styles.integrationLinks} aria-label="Other ways to use release evidence">
        <span>Use the same evidence in your workflow</span>
        <Link href="/cli">GuardRails CLI <ArrowUpRight /></Link>
        <Link href="/badge">Reports, exports, and badges <ArrowUpRight /></Link>
        <Link href="/docs/mcp">AI and API access <ArrowUpRight /></Link>
      </nav>
    </section>

    <section className={styles.researchLink}><p>Research note</p><div><h2>What an extension can reach is a supply-chain question.</h2><Link href="/research/solidity-pro">Read the Solidity Pro case study <ArrowUpRight /></Link></div></section>

    <section className={styles.teamSection} aria-labelledby="team-heading">
      <div className={styles.teamIntro}>
        <span className={styles.sectionKicker}>05 / For teams</span>
        <h2 id="team-heading">Turn one good review into a system.</h2>
        <p>Give reviewers one place to triage changes, carry decisions forward, and publish the evidence developers need before they install.</p>
        <Link href="/workspace">Open the team workspace <ArrowRight /></Link>
      </div>
      <div className={styles.teamGrid}>
        <article><span>01</span><h3>Review inbox</h3><p>Route new releases to the people who can decide.</p></article>
        <article><span>02</span><h3>Decision memory</h3><p>Keep the reason and baseline with each version.</p></article>
        <article><span>03</span><h3>Release monitoring</h3><p>Know when a watched extension changes its access surface.</p></article>
        <article><span>04</span><h3>Trust badges</h3><p>Share a current, verifiable result with your developers.</p></article>
      </div>
    </section>

    <IdeCompatibility />
    <TrustProof />
    <section className={styles.close}><span className={styles.sectionKicker}>The next install is a decision</span><h2>Inspect one extension.<br /><em>Keep the evidence.</em></h2><Link href="/registry">Check an extension <ArrowRight /></Link></section>
  </main>;
}
