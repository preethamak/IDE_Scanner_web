import Link from "next/link";
import { ArrowRight, Check, CircleDot, FileCode2, Network, ShieldCheck, TerminalSquare } from "lucide-react";
import HomeSearch from "@/app/HomeSearch";
import styles from "./landing.module.css";

const popular = [
  ["GitHub Copilot", "GitHub.copilot"],
  ["Cline", "saoudrizwan.claude-dev"],
  ["ESLint", "dbaeumer.vscode-eslint"],
  ["Docker", "ms-azuretools.vscode-docker"],
] as const;

export default function HomeHero() {
  return (
    <section className={styles.hero}>
      <div className={styles.heroGrid} aria-hidden="true" />
      <div className={styles.heroCopy}>
        <span className={styles.eyebrow}><i /> Extension security intelligence</span>
        <h1>Know what enters<br />your <em>editor.</em></h1>
        <p>Inspect the exact extension release before installation. See capabilities, evidence, and meaningful changes without digging through a package yourself.</p>
        <div className={styles.searchShell}><HomeSearch /></div>
        <div className={styles.popular}><span>Popular</span>{popular.map(([label, query]) => <Link href={`/registry?q=${encodeURIComponent(query)}`} key={query}>{label}</Link>)}</div>
        <div className={styles.heroProof}><span><Check /> Exact-version reports</span><span><Check /> Evidence-first decisions</span><span><Check /> Release monitoring</span></div>
      </div>

      <div className={styles.heroProduct} aria-label="GuardRails extension intelligence product preview">
        <div className={styles.productGlow} aria-hidden="true" />
        <div className={styles.appWindow}>
          <header><span><i /><i /><i /></span><code>guardrails / extension / release</code><b><CircleDot /> Live</b></header>
          <div className={styles.appBody}>
            <aside><ShieldCheck /><span>Overview</span><FileCode2 /><TerminalSquare /><Network /></aside>
            <div className={styles.report}>
              <div className={styles.reportTop}><div className={styles.extensionMark}>E</div><div><small>EXACT RELEASE</small><strong>Example Extension</strong><code>@1.4.0</code></div><span>Review</span></div>
              <div className={styles.scoreRow}><div><small>DECISION</small><strong>Review changes</strong></div><div className={styles.score}><b>82</b><small>% coverage</small></div></div>
              <div className={styles.capabilityGrid}>
                <article><FileCode2 /><span>Project files</span><strong>Read + write</strong><small>4 evidence items</small></article>
                <article className={styles.newCapability}><TerminalSquare /><span>Commands</span><strong>Runs tools</strong><small>New in 1.4.0</small></article>
                <article className={styles.newCapability}><Network /><span>Network</span><strong>3 hosts</strong><small>New in 1.4.0</small></article>
              </div>
            </div>
          </div>
          <footer><span><ShieldCheck /> Artifact verified</span><span>12 evidence items</span><button type="button">Open report <ArrowRight /></button></footer>
        </div>
        <div className={styles.floatingAlert}><span><TerminalSquare /></span><div><small>RELEASE CHANGE</small><strong>New command capability</strong></div><b>Review</b></div>
      </div>
    </section>
  );
}
