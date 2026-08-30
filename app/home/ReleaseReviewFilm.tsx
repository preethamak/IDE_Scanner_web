"use client";

import { useEffect, useState } from "react";
import { Check, ChevronRight, CircleAlert, GitCompareArrows, MousePointer2 } from "lucide-react";
import styles from "./releaseReviewFilm.module.css";

const stages = ["arrived", "explained", "saved"] as const;
type Stage = (typeof stages)[number];

export default function ReleaseReviewFilm() {
  const [stage, setStage] = useState<Stage>("arrived");

  useEffect(() => {
    let step = 0;
    const timer = window.setInterval(() => {
      step = (step + 1) % stages.length;
      setStage(stages[step]);
    }, 3100);
    return () => window.clearInterval(timer);
  }, []);

  return <div className={`${styles.film} ${styles[stage]}`} aria-label="GuardRails release review in action">
    <header className={styles.chrome}><div><i /><i /><i /></div><b>GuardRails</b><span>Acme workspace <ChevronRight /> Review queue</span><small>Live preview</small></header>
    <div className={styles.body} style={{ position: "relative" }}>
      <aside className={styles.side}><b>WORKSPACE</b><span className={styles.active}>Review queue <i>1</i></span><span>Inventory</span><span>Decisions</span><span>Monitoring</span><footer><i /> Connected</footer></aside>
      <main className={styles.workspace}>
        <div className={styles.topline}><div><p>RELEASE UPDATE</p><h3>Workspace assistant <small>2.8.0 → 2.9.0</small></h3></div><span className={styles.pending}><i /> Needs review</span></div>
        <div className={styles.tabs}><span className={styles.selected}>What changed <i>1</i></span><span>Previous decision</span><span>Evidence</span></div>
        <article className={styles.change}><div className={styles.changeIcon}><CircleAlert /></div><div><p>NEW CAPABILITY</p><h4>Terminal access</h4><span>Can run commands in the current workspace</span></div><b>Added</b></article>
        <article className={styles.note}><GitCompareArrows /><div><b>New compared with your approved version</b><p>Open the context before you decide.</p></div><ChevronRight /></article>
        <footer className={styles.actions}><span><i /> Evidence is attached to this release</span><button>{stage === "saved" ? <><Check /> Decision saved</> : "Review change"}</button></footer>
        <MousePointer2 className={styles.cursor} />
      </main>
        <aside className={styles.drawer} style={{ position: "absolute", zIndex: 3, top: 0, right: 0, bottom: 0, width: 255, borderLeftWidth: 1, opacity: stage === "arrived" ? 0 : 1, transform: stage === "arrived" ? "translateX(100%)" : "translateX(0)", transition: "opacity 250ms ease, transform 550ms cubic-bezier(.2,.8,.2,1)", boxShadow: "-16px 0 35px rgba(76,77,101,.06)" }}><header><div><p>GUARDRAILS EXPLAINS</p><h4>What this means here</h4></div><span>1 / 1</span></header><div className={styles.impact}><b>Workspace impact</b><p>This tool can run commands with workspace permissions.</p></div><div className={styles.evidence}><span>WHY NOW</span><p>Added after the approved baseline.</p></div><footer><span>Evidence attached</span><button>Save decision <Check /></button></footer></aside>
    </div>
    <footer className={styles.caption}><span>Watch a release become a decision.</span><div><i className={stage === "arrived" ? styles.on : ""} /><i className={stage === "explained" ? styles.on : ""} /><i className={stage === "saved" ? styles.on : ""} /></div></footer>
  </div>;
}
