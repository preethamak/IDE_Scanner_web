"use client";

import { useEffect, useState } from "react";
import { Check, ChevronRight, Clock3, GitCompareArrows, MousePointer2 } from "lucide-react";
import styles from "./decisionMemoryFilm.module.css";

export default function DecisionMemoryFilm() {
  const [nextRelease, setNextRelease] = useState(false);
  useEffect(() => {
    const timer = window.setInterval(() => setNextRelease((value) => !value), 4200);
    return () => window.clearInterval(timer);
  }, []);

  return <section className={styles.scene}>
    <div className={styles.copy}><p><i /> Built-up context</p><h2>Your last review<br />should <em>carry forward.</em></h2><span>When the next version appears, its review begins with the last decision—not a blank page.</span></div>
    <div className={`${styles.window} ${nextRelease ? styles.next : ""}`} aria-label="GuardRails decision history interaction">
      <header><div><i /><i /><i /></div><b>GuardRails</b><span>Release history</span><small>Workspace assistant</small></header>
      <div className={styles.app}>
        <aside><p>RELEASES</p><button className={styles.approved}><Check /><span>2.9.0<small>Approved</small></span></button><button className={styles.incoming}><Clock3 /><span>3.0.0<small>New release</small></span><i /></button><footer>3 tracked versions</footer></aside>
        <main>
          <div className={styles.title}><div><p>{nextRelease ? "NEXT REVIEW" : "TRUSTED BASELINE"}</p><h3>{nextRelease ? "Compare 3.0.0" : "Decision for 2.9.0"}</h3></div><span>{nextRelease ? "1 change" : "Saved"}</span></div>
          <div className={styles.rule} />
          <article className={styles.decision}><header><span><Check /></span><div><b>Approved with context</b><small>Decision attached to this exact release</small></div></header><p>Terminal access is expected for this workspace. The reviewer confirmed the capability is required for the team’s workflow.</p><footer><span>Evidence retained</span><span>Workspace scope</span></footer></article>
          <article className={styles.compare}><GitCompareArrows /><div><b>{nextRelease ? "3.0.0 is ready to compare" : "This is the baseline for the next release"}</b><p>{nextRelease ? "GuardRails brings forward the last decision, then shows only what changed." : "A future update begins here, with context intact."}</p></div><ChevronRight /></article>
          <MousePointer2 className={styles.cursor} />
        </main>
      </div>
      <footer className={styles.caption}><span>Review a release once. Every future release starts from that answer.</span><div><i className={!nextRelease ? styles.on : ""} /><i className={nextRelease ? styles.on : ""} /></div></footer>
    </div>
  </section>;
}
