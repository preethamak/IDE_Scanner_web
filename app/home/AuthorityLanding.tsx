import Link from "next/link";
import { ArrowRight, Check, ChevronRight } from "lucide-react";
import styles from "./authorityLanding.module.css";
import ReleaseReviewFilm from "./ReleaseReviewFilm";
import DecisionMemoryFilm from "./DecisionMemoryFilm";

function ChangeStory() {
  return <section id="how" className={styles.story}>
    <div className={styles.storyIntro}><p className={styles.eyebrow}><i /> One release, end to end</p><h2>The work is not<br /><em>finding a signal.</em></h2><p>It is making the decision understandable enough that the next person does not have to start over.</p></div>
    <div className={styles.beatList}>
      <article className={styles.beat}><span className={styles.index}>01</span><div><p>Release arrives</p><h3>See precisely what crossed the line.</h3></div><div className={styles.delta}><small>NEW IN 2.9.0</small><strong>+ terminal access</strong><span>Added capability</span></div></article>
      <article className={styles.beat}><span className={styles.index}>02</span><div><p>Context opens</p><h3>Read the consequence, not a wall of findings.</h3></div><div className={styles.explain}><i /><div><b>Workspace impact</b><span>Commands can run with project permissions.</span></div></div></article>
      <article className={styles.beat}><span className={styles.index}>03</span><div><p>Decision stays</p><h3>Leave a call the team can reuse later.</h3></div><div className={styles.saved}><Check /><div><b>Approved for this workspace</b><span>Decision attached to version 2.9.0</span></div></div></article>
    </div>
  </section>;
}

export default function AuthorityLanding() {
  return <main className={styles.page}>
    <section className={styles.hero}>
      <div className={styles.heroCopy}><p className={styles.eyebrow}><i /> GuardRails for developer tools</p><h1>When a tool<br />changes, <em>know why.</em></h1><p className={styles.heroLead}>GuardRails turns a release change into a clear, durable decision for the people who use the tool.</p><div className={styles.actions}><Link href="/registry">Check an extension <ArrowRight /></Link><Link href="#how">See the flow <ChevronRight /></Link></div></div>
      <div className={styles.heroVisual}><span className={styles.orbit} /><ReleaseReviewFilm /></div>
    </section>
    <section className={styles.statement}><p className={styles.eyebrow}><i /> The moment that matters</p><h2>A release changes.<br /><em>Your team decides.</em></h2><p>GuardRails keeps that moment clear, quick, and attached to the work.</p></section>
    <DecisionMemoryFilm />
    <section className={styles.close}><p className={styles.eyebrow}><i /> Start with one tool</p><h2>See the change.<br /><em>Make the call.</em></h2><Link href="/registry">Explore GuardRails <ArrowRight /></Link></section>
  </main>;
}
