import Link from "next/link";
import { ArrowRight, Check, ChevronRight, CircleAlert, LockKeyhole, Network, Terminal } from "lucide-react";
import AuroraBackdrop from "@/app/components/react-bits/AuroraBackdrop";
import SpotlightCard from "@/app/components/react-bits/SpotlightCard";
import styles from "./authorityLanding.module.css";

function InstallMoment() {
  return <SpotlightCard className={styles.moment} spotlightColor="rgba(118, 88, 216, .18)">
    <header><span className={styles.logo}>G</span><strong>GuardRails</strong><small>Before install</small></header>
    <section className={styles.extension}><div className={styles.extensionIcon}>+</div><div><small>EXTENSION UPDATE</small><strong>New version ready to install</strong><p>GuardRails found a meaningful change.</p></div></section>
    <section className={styles.question}><span><CircleAlert /></span><div><small>ONE THING CHANGED</small><h2>This update can run terminal commands.</h2><p>That can affect files and processes in your workspace.</p></div></section>
    <section className={styles.explainer}><Terminal /><p><b>What this means</b> The extension can ask your editor to execute commands on your machine.</p><ChevronRight /></section>
    <footer><button>Review change <ArrowRight /></button><span><LockKeyhole /> Nothing installs until you decide</span></footer>
  </SpotlightCard>;
}

export default function AuthorityLanding() {
  return <main className={styles.page}>
    <section className={styles.hero}>
      <AuroraBackdrop className={styles.aurora} />
      <div className={styles.copy}><p className={styles.eyebrow}><i /> The trust layer for developer tools</p><h1>Before a tool gets access,<br /><em>it gets context.</em></h1><p className={styles.lede}>GuardRails gives teams one calm place to understand what changed, decide what is acceptable, and remember why.</p><div className={styles.actions}><Link href="/registry">Explore GuardRails <ArrowRight /></Link><Link href="#how">See the product loop <ChevronRight /></Link></div><p className={styles.note}>Extensions · AI agents · local developer tools</p></div>
      <InstallMoment />
    </section>
    <section id="how" className={styles.outcome}><p className={styles.eyebrow}><i /> The GuardRails loop</p><h2>One system for every<br />tool in your editor.</h2><p className={styles.systemLead}>GuardRails follows the lifecycle of access—not just the moment something looks risky.</p><div className={styles.loopGrid}><article><span>01</span><h3>Inventory</h3><p>Know which tools your team has trusted.</p></article><article><span>02</span><h3>Detect</h3><p>Catch a new release as a new artifact, not “latest”.</p></article><article><span>03</span><h3>Explain</h3><p>Turn changed capability into a consequence people can judge.</p></article><article><span>04</span><h3>Decide</h3><p>Record the human decision beside the evidence.</p></article><article><span>05</span><h3>Monitor</h3><p>Return only when the trust boundary changes again.</p></article></div></section>
    <section className={styles.productStrip}><div><p className={styles.eyebrow}><i /> Decisions compound</p><h2>Make a call once.<br />Start smarter next time.</h2><p>Every approval creates the baseline for the next release. That is how a tool review becomes a team memory.</p><Link href="/monitor">See release monitoring <ArrowRight /></Link></div><div className={styles.receipt}><header><span>Decision receipt</span><Check /></header><strong>Approved with context</strong><p>Terminal access is expected for this workflow. The scope is understood and the evidence remains attached.</p><footer><span>Artifact bound</span><span>Reviewer rationale</span><span>Baseline ready</span></footer></div></section>
    <section className={styles.close}><p className={styles.eyebrow}><i /> Start with one tool</p><h2>See the access.<br />Make the call.</h2><Link href="/registry">Search extensions <ArrowRight /></Link></section>
  </main>;
}
