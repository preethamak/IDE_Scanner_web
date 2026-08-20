import Link from "next/link";
import { ArrowRight, Check, ChevronRight, CircleAlert, LockKeyhole, Network, Terminal } from "lucide-react";
import styles from "./authorityLanding.module.css";

function InstallMoment() {
  return <div className={styles.moment} aria-label="GuardRails pauses an extension update for review">
    <header><span className={styles.logo}>G</span><strong>GuardRails</strong><small>Before install</small></header>
    <section className={styles.extension}><div className={styles.extensionIcon}>+</div><div><small>EXTENSION UPDATE</small><strong>New version ready to install</strong><p>GuardRails found a meaningful change.</p></div></section>
    <section className={styles.question}><span><CircleAlert /></span><div><small>ONE THING CHANGED</small><h2>This update can run terminal commands.</h2><p>That can affect files and processes in your workspace.</p></div></section>
    <section className={styles.explainer}><Terminal /><p><b>What this means</b> The extension can ask your editor to execute commands on your machine.</p><ChevronRight /></section>
    <footer><button>Review change <ArrowRight /></button><span><LockKeyhole /> Nothing installs until you decide</span></footer>
  </div>;
}

export default function AuthorityLanding() {
  return <main className={styles.page}>
    <section className={styles.hero}>
      <div className={styles.copy}><p className={styles.eyebrow}><i /> Extension security, made clear</p><h1>Know what your<br />tools can do<br /><em>before they do it.</em></h1><p className={styles.lede}>GuardRails shows the real access an extension asks for—at install and whenever an update changes the deal.</p><div className={styles.actions}><Link href="/registry">Check an extension <ArrowRight /></Link><Link href="#how">How it works <ChevronRight /></Link></div><p className={styles.note}>For extensions, AI agents, and developer tools.</p></div>
      <InstallMoment />
    </section>
    <section id="how" className={styles.outcome}><p className={styles.eyebrow}><i /> No more guessing</p><h2>Every update gets<br />a plain-English answer.</h2><div className={styles.outcomeGrid}><article><span>01</span><h3>What changed?</h3><p>See only the new access and behavior, not a wall of technical noise.</p></article><article><span>02</span><h3>Why does it matter?</h3><p>Translate permissions into the impact they can have in your workspace.</p></article><article><span>03</span><h3>What did we decide?</h3><p>Keep the approval, evidence, and reason beside the exact version.</p></article></div></section>
    <section className={styles.productStrip}><div><p className={styles.eyebrow}><i /> A calmer release process</p><h2>Review the change.<br />Keep the context.</h2><p>When another update arrives, your team starts with the decision it made last time—not from zero.</p><Link href="/monitor">See release monitoring <ArrowRight /></Link></div><div className={styles.receipt}><header><span>Decision saved</span><Check /></header><strong>Approved with context</strong><p>New terminal access is expected for this workflow.</p><footer><span>Evidence attached</span><span>Ready for next update</span></footer></div></section>
    <section className={styles.close}><p className={styles.eyebrow}><i /> Start with one tool</p><h2>See the access.<br />Make the call.</h2><Link href="/registry">Search extensions <ArrowRight /></Link></section>
  </main>;
}
