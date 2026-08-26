import Link from "next/link";
import { ArrowRight, Check, ChevronRight } from "lucide-react";
import styles from "./authorityLanding.module.css";
import ReleaseReviewFilm from "./ReleaseReviewFilm";
import DecisionMemoryFilm from "./DecisionMemoryFilm";
import MarketplaceProof from "./MarketplaceProof";
import TrustProof from "./TrustProof";
import LandingFaq from "./LandingFaq";

function ChangeStory() {
  return <section id="how" className={styles.story}>
    <div className={styles.storyIntro}><p className={styles.eyebrow}><i /> One release, end to end</p><h2>The hard part is not<br /><em>finding a scan result.</em></h2><p>It is understanding what a change means, and leaving an answer the next person can use.</p></div>
    <div className={styles.beatList}>
      <article className={styles.beat}><span className={styles.index}>01</span><div><p>Release arrives</p><h3>See exactly what was added.</h3></div><div className={styles.delta}><small>NEW IN 2.9.0</small><strong>+ terminal access</strong><span>Added capability</span></div></article>
      <article className={styles.beat}><span className={styles.index}>02</span><div><p>Context opens</p><h3>Read what it means for your project, in plain terms.</h3></div><div className={styles.explain}><i /><div><b>Workspace impact</b><span>Commands can run with project permissions.</span></div></div></article>
      <article className={styles.beat}><span className={styles.index}>03</span><div><p>Decision stays</p><h3>Record the decision so the next release starts from it, not from zero.</h3></div><div className={styles.saved}><Check /><div><b>Approved for this workspace</b><span>Decision attached to version 2.9.0</span></div></div></article>
    </div>
  </section>;
}

export default function AuthorityLanding() {
  return <main className={styles.page}>
    <section className={styles.hero}>
      <div className={styles.heroCopy}><p className={styles.eyebrow}><i /> IDE extension security</p><h1>Know what an extension<br />does <em>before you install it.</em></h1><p className={styles.heroLead}>GuardRails scans marketplace extensions before you install them, then watches every update and flags when one quietly gains access to your terminal, files, or network.</p><div className={styles.actions}><Link href="/registry">Check an extension <ArrowRight /></Link><Link href="#how">See the flow <ChevronRight /></Link></div></div>
      <div className={styles.heroVisual}><ReleaseReviewFilm /></div>
    </section>
    <MarketplaceProof />
    <TrustProof />
    <section className={styles.statement}><p className={styles.eyebrow}><i /> The moment that matters</p><h2>A release changes.<br /><em>Your team decides.</em></h2><p>GuardRails keeps that moment clear, quick, and attached to the work.</p></section>
    <DecisionMemoryFilm />
    <LandingFaq />
    <section className={styles.close}><p className={styles.eyebrow}><i /> Start with one tool</p><h2>See the change.<br /><em>Make the call.</em></h2><Link href="/registry">Explore GuardRails <ArrowRight /></Link></section>
  </main>;
}
