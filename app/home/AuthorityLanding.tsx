import Link from "next/link";
import { AlertTriangle, ArrowRight, Check, ChevronRight, MousePointer2 } from "lucide-react";
import AuroraBackdrop from "@/app/components/react-bits/AuroraBackdrop";
import styles from "./authorityLanding.module.css";
import film from "./productFilm.module.css";

function ProductFilm() {
  return <div className={film.film} aria-label="GuardRails product interaction">
    <header><span><i /><i /><i /></span><strong>GuardRails</strong><small>Workspace / review queue</small></header>
    <div className={film.filmCanvas}>
      <aside className={film.rail}><b>WORKSPACE</b><span>Review queue</span><span>Inventory</span><span>Decisions</span><span>Monitoring</span></aside>
      <div className={film.screen}>
        <div className={film.screenTop}><div><p>Release update</p><h3>Review what changed</h3></div><span className={film.live}><i /> New</span></div>
        <div className={film.tool}><span className={film.toolMark}>A</span><div><strong>Workspace assistant</strong><small>Version 2.8.0 → 2.9.0</small></div></div>
        <div className={film.comparison}><header><span>New capability</span><b>Changed</b></header><div className={film.permission}><AlertTriangle /><div><strong>Terminal access</strong><small>Can run commands in the current workspace</small></div><em>Added</em></div></div>
        <div className={film.actions}><span>1 change needs a decision</span><button className={film.review}>Review change</button></div>
        <aside className={film.detail}><header><span>GuardRails</span><b>Why this matters</b></header><p>This tool can now run commands with your workspace permissions. Review the reason before your team updates.</p><footer><span>Evidence attached</span><button>Save decision</button></footer></aside>
        <MousePointer2 className={film.cursor} />
      </div>
    </div>
    <footer><span>One change. Clear context. A decision your team can return to.</span><b>Product interaction</b></footer>
  </div>;
}

export default function AuthorityLanding() {
  return <main className={styles.page}>
    <section className={styles.hero}>
      <AuroraBackdrop className={styles.aurora} />
      <div className={styles.copy}><p className={styles.eyebrow}><i /> GuardRails</p><h1>Tools move fast.<br /><em>Trust should keep up.</em></h1><div className={styles.actions}><Link href="/registry">Explore GuardRails <ArrowRight /></Link><Link href="#how">How it works <ChevronRight /></Link></div></div>
      <ProductFilm />
    </section>
    <section id="how" className={styles.outcome}><p className={styles.eyebrow}><i /> The GuardRails loop</p><h2>One system for every<br />tool in your editor.</h2><p className={styles.systemLead}>GuardRails follows the lifecycle of access—not just the moment something looks risky.</p><div className={styles.loopGrid}><article><span>01</span><h3>Inventory</h3><p>Know which tools your team has trusted.</p></article><article><span>02</span><h3>Detect</h3><p>Catch a new release as a new artifact, not “latest”.</p></article><article><span>03</span><h3>Explain</h3><p>Turn changed capability into a consequence people can judge.</p></article><article><span>04</span><h3>Decide</h3><p>Record the human decision beside the evidence.</p></article><article><span>05</span><h3>Monitor</h3><p>Return only when the trust boundary changes again.</p></article></div></section>
    <section className={styles.productStrip}><div><p className={styles.eyebrow}><i /> Decisions compound</p><h2>Make a call once.<br />Start smarter next time.</h2><p>Every approval creates the baseline for the next release. That is how a tool review becomes a team memory.</p><Link href="/monitor">See release monitoring <ArrowRight /></Link></div><div className={styles.receipt}><header><span>Decision receipt</span><Check /></header><strong>Approved with context</strong><p>Terminal access is expected for this workflow. The scope is understood and the evidence remains attached.</p><footer><span>Artifact bound</span><span>Reviewer rationale</span><span>Baseline ready</span></footer></div></section>
    <section className={styles.close}><p className={styles.eyebrow}><i /> Start with one tool</p><h2>See the access.<br />Make the call.</h2><Link href="/registry">Search extensions <ArrowRight /></Link></section>
  </main>;
}
