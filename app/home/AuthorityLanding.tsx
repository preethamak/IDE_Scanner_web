import Link from "next/link";
import { ArrowRight, Check, ChevronRight, MousePointer2, Sparkles } from "lucide-react";
import AuroraBackdrop from "@/app/components/react-bits/AuroraBackdrop";
import styles from "./authorityLanding.module.css";
import film from "./productFilm.module.css";

function ProductFilm() {
  return <div className={film.film} aria-label="GuardRails product interaction">
    <header><span><i /><i /><i /></span><strong>GuardRails</strong><small>Watching your tools</small></header>
    <div className={film.filmCanvas}>
      <div className={film.incoming}><span>New tool update</span><strong>Access request</strong><small>Just arrived</small></div>
      <div className={film.guard}><span><Sparkles /></span><strong>GuardRails</strong><small>Understood the change</small></div>
      <div className={film.decision}><span><Check /></span><strong>Decision saved</strong><small>Ready for the next update</small></div>
      <i className={film.path} /><i className={film.pathTwo} />
      <MousePointer2 className={film.cursor} />
    </div>
    <footer><span>See the change. Keep the context.</span><b>Live product flow</b></footer>
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
