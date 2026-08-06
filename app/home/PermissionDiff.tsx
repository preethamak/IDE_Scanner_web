"use client";

import Link from "next/link";
import { ArrowRight, Check, FileCode2, Network, ShieldAlert, TerminalSquare } from "lucide-react";
import { useState } from "react";
import SpotlightCard from "@/app/components/react-bits/SpotlightCard";
import styles from "./landing.module.css";

const capabilities = [
  { icon: FileCode2, label: "Workspace files", before: "Read project files", after: "Read project files", changed: false },
  { icon: TerminalSquare, label: "Terminal", before: "No command access", after: "Runs shell commands", changed: true },
  { icon: Network, label: "Network", before: "2 known destinations", after: "3 destinations", changed: true },
] as const;

export default function PermissionDiff() {
  const [release,setRelease]=useState<"before"|"after">("after");
  return <section className={styles.permissionSection} aria-labelledby="permission-diff-heading">
    <header><div><span className={styles.eyebrow}><i/> The GuardRails difference</span><h2 id="permission-diff-heading">See the permission change,<br/>not just the version number.</h2></div><p>An ordinary update notice says a release is available. GuardRails shows the new authority that release asks your team to trust.</p></header>
    <SpotlightCard className={styles.permissionWindow} spotlightColor="rgba(47,111,221,.14)">
      <div className={styles.permissionTop}><div><span className={styles.extensionGlyph}>CL</span><div><strong>Cline</strong><code>saoudrizwan.claude-dev</code></div></div><div className={styles.releaseToggle} role="group" aria-label="Choose release"><button className={release==="before"?styles.toggleActive:""} onClick={()=>setRelease("before")} aria-pressed={release==="before"}>3.18.2 <small>Reviewed</small></button><button className={release==="after"?styles.toggleActive:""} onClick={()=>setRelease("after")} aria-pressed={release==="after"}>3.19.0 <small>New release</small></button></div></div>
      <div className={styles.permissionBody}><div className={styles.permissionSummary}><span>{release==="after"?"2 meaningful changes":"Previously approved baseline"}</span><h3>{release==="after"?"This update needs a review.":"This is what your team already trusted."}</h3><p>{release==="after"?"Command execution and a new network destination appear in the new package.":"Move to the new release to see what changed since this decision."}</p><div>{release==="after"?<><b><ShieldAlert/> Review before rollout</b><small>Exact package · 94% analysis coverage</small></>:<><b className={styles.baseline}><Check/> Reviewed baseline</b><small>Decision recorded 12 days ago</small></>}</div></div><div className={styles.permissionRows}>{capabilities.map(({icon:Icon,label,before,after,changed})=><article className={release==="after"&&changed?styles.permissionChanged:""} key={label}><Icon/><div><span>{label}</span><strong>{release==="after"?after:before}</strong></div>{release==="after"&&changed?<em>New</em>:<Check/>}</article>)}</div></div>
      <footer><span>Every result stays attached to one exact extension package.</span><Link href="/registry?q=saoudrizwan.claude-dev">Open a real extension <ArrowRight/></Link></footer>
    </SpotlightCard>
  </section>;
}
