import Link from "next/link";
import { AlertTriangle, ArrowRight, Check, ChevronRight, MousePointer2 } from "lucide-react";
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
      <div className={styles.heroVisual}><span className={styles.orbit} /><ProductFilm /></div>
    </section>
    <section className={styles.statement}><p className={styles.eyebrow}><i /> Not another dashboard</p><h2>A security review should feel like<br /><em>one clear question.</em></h2><p>What changed? What does it mean here? Is it okay to proceed?</p></section>
    <ChangeStory />
    <section className={styles.memory}><div><p className={styles.eyebrow}><i /> Team memory</p><h2>Decisions should<br />outlive the meeting.</h2><p>GuardRails preserves the evidence, the reasoning, and the release it belongs to—so the next update has a real baseline.</p><Link href="/monitor">See release monitoring <ArrowRight /></Link></div><div className={styles.memoryVisual}><header><span>Decision history</span><b>Workspace assistant</b></header><div className={styles.historyLine}><i /><i /><i /></div><article><span>2.9.0</span><div><b>Approved with context</b><small>Terminal access reviewed for this workspace</small></div><Check /></article><article><span>2.8.0</span><div><b>Baseline saved</b><small>Previous trusted version</small></div></article><footer>Release-aware decisions, kept together.</footer></div></section>
    <section className={styles.close}><p className={styles.eyebrow}><i /> Start with one tool</p><h2>See the change.<br /><em>Make the call.</em></h2><Link href="/registry">Explore GuardRails <ArrowRight /></Link></section>
  </main>;
}
