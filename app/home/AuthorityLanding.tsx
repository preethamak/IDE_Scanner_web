import Link from "next/link";
import { ArrowRight, Check, ChevronRight, CircleAlert, Code2, Network, Terminal } from "lucide-react";
import styles from "./authorityLanding.module.css";

function ReleaseReviewMotion() {
  return <div className={styles.productMotion} aria-label="An extension release is reviewed before installation">
    <div className={styles.windowBar}><span /><span /><span /><p>GuardRails · Release review</p><small>LIVE</small></div>
    <div className={styles.motionBody}>
      <div className={styles.motionTitle}><div className={styles.appIcon}>GR</div><div><small>EXTENSION UPDATE</small><strong>Workspace assistant <em>2.4.0</em></strong></div><button>Install</button></div>
      <div className={styles.notice}><CircleAlert /> This update asks for new access <span>2 changes</span></div>
      <div className={styles.rows}>
        <article><Terminal /><div><small>TERMINAL</small><strong>Execute shell commands</strong></div><b>NEW</b></article>
        <article><Network /><div><small>NETWORK</small><strong>api.anthropic.com</strong></div><b>+ 1 host</b></article>
        <article><Code2 /><div><small>WORKSPACE FILES</small><strong>Read and write files</strong></div><i>Unchanged</i></article>
      </div>
      <div className={styles.review}><div><span className={styles.avatar}>PS</span><p><small>TEAM DECISION</small><strong>Review before rollout</strong></p></div><button>Approve <Check /></button></div>
      <div className={styles.cursor} aria-hidden="true"><i /></div>
    </div>
  </div>;
}

export default function AuthorityLanding() {
  return <main className={styles.page}>
    <section className={styles.hero}>
      <div className={styles.heroCopy}>
        <p className={styles.eyebrow}><i /> Extension release security</p>
        <h1>See what changed<br />before it <em>ships.</em></h1>
        <p>GuardRails turns every extension update into a clear, reviewable decision—before it reaches your editors.</p>
        <div className={styles.actions}><Link href="/registry">Check an extension <ArrowRight /></Link><Link href="#how">See it in action <ChevronRight /></Link></div>
        <div className={styles.trust}><span><b>60k+</b> marketplace extensions</span><span><b>Before install</b> and every update</span></div>
      </div>
      <ReleaseReviewMotion />
    </section>

    <section id="how" className={styles.steps}>
      <header><p className={styles.eyebrow}><i /> One calm workflow</p><h2>From a new release<br />to a confident yes.</h2></header>
      <div><article><span>01</span><h3>Spot the change</h3><p>Compare the exact new package with the version your team already reviewed.</p></article><article><span>02</span><h3>See the access</h3><p>Commands, files, network destinations, and behavior—shown in plain language.</p></article><article><span>03</span><h3>Keep the reason</h3><p>Approve with context, so the next update starts from a real decision.</p></article></div>
    </section>

    <section className={styles.watch}><div><p className={styles.eyebrow}><i /> Works in the background</p><h2>The right update<br />finds the right person.</h2><p>Monitor approved extensions and route only meaningful changes to the people who can decide.</p><Link href="/monitor">Explore monitoring <ArrowRight /></Link></div><div className={styles.timeline}><header><span><i /> Monitoring your extensions</span><small>Now</small></header><article><time>09:41</time><div><small>NEW RELEASE</small><strong>An extension update was found</strong></div><em>Seen</em></article><article className={styles.changed}><time>09:42</time><div><small>ACCESS CHANGE</small><strong>Terminal + network added</strong></div><em>Review</em></article><article><time>09:43</time><div><small>ROUTED</small><strong>Sent to the right reviewer</strong></div><ArrowRight /></article></div></section>

    <section className={styles.closing}><p className={styles.eyebrow}><i /> Start with one extension</p><h2>Good decisions start<br />with better context.</h2><Link href="/registry">Search the registry <ArrowRight /></Link></section>
  </main>;
}
