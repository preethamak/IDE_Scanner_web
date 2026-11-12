import type { Metadata } from "next";
import { ArrowRight, Check, FileSearch, History, ShieldCheck, Sparkles } from "lucide-react";
import styles from "./hackathon.module.css";

export const metadata: Metadata = {
  title: "Hackathon Builder Pass",
  description: "Try GuardRails with ten exact-release extension Deep Scans. No card required.",
  alternates: { canonical: "/hackathon" },
};

export default function HackathonPage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}><i /> Hackathon Builder Pass</span>
          <h1>Ship your idea.<br /><em>Know what runs beside it.</em></h1>
          <p>GuardRails helps you check the editor extensions your project depends on. Start with an exact release, read its evidence, and keep an eye on the versions you choose.</p>
          <div className={styles.actions}>
            <form action="/api/hackathon/activate" method="post"><button className={styles.primary}>Claim 10 free scans <ArrowRight /></button></form>
            <form action="/api/hackathon/activate" method="post"><button className={styles.secondary} name="to" value="scan">Scan an extension first</button></form>
          </div>
          <small>No card · 30-day scan window · Your source code stays on your machine</small>
        </div>
        <aside className={styles.offer} aria-label="Hackathon pass details">
          <span className={styles.offerIcon}><Sparkles /></span>
          <span className={styles.offerLabel}>Your pass</span>
          <strong>10</strong>
          <h2>Deep Scans</h2>
          <p>Five more scans than the standard free trial. The allowance follows the current 30-day scan window.</p>
          <div><Check /> Exact extension release</div>
          <div><Check /> No payment details</div>
          <div><Check /> Public reports stay open</div>
        </aside>
      </section>

      <section className={styles.steps} aria-labelledby="start-heading">
        <header><span>Useful in a few minutes</span><h2 id="start-heading">Go from extension name to a decision.</h2></header>
        <div className={styles.stepGrid}>
          <article><span>01</span><FileSearch /><h3>Find the release</h3><p>Search the Marketplace and Open VSX catalog by extension name or ID.</p></article>
          <article><span>02</span><ShieldCheck /><h3>Read the evidence</h3><p>Review findings for that exact version. Analysis is a signal to inspect, not a safety guarantee.</p></article>
          <article><span>03</span><History /><h3>Keep your place</h3><p>Create a free account to save scan history and monitor up to three extensions.</p></article>
        </div>
      </section>

      <section className={styles.closing}>
        <div><span>Technology partner</span><h2>Build with confidence, then get back to building.</h2></div>
        <form action="/api/hackathon/activate" method="post"><button>Activate your Builder Pass <ArrowRight /></button></form>
      </section>
      <p className={styles.disclosure}>Hackathon Builder Pass adds five scans to the standard five-scan allowance. The 30-day scan window remains anchored to the first scan and is not restarted when the pass is activated; the expanded allowance is available once per network address per window. GuardRails billing is not open, and the pass does not start a paid subscription.</p>
    </main>
  );
}
