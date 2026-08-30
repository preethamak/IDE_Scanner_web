"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, LoaderCircle, ShieldAlert } from "lucide-react";
import TeamWorkspace from "@/app/TeamWorkspace";
import { browserDb } from "@/lib/supabase";
import styles from "./workspace.module.css";

export default function WorkspacePage() {
  const db = useMemo(() => browserDb(), []);
  const [state, setState] = useState<"loading" | "ready" | "signed-out" | "error">("loading");

  useEffect(() => {
    document.body.classList.add("guardrails-workspace-mode");
    return () => document.body.classList.remove("guardrails-workspace-mode");
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      // No workspace connection available: for a visitor this is the same as
      // being signed out, so show the gate rather than an error page.
      if (!db) { setState("signed-out"); return; }
      void db.auth.getUser()
        .then(({ data }) => setState(data.user ? "ready" : "signed-out"))
        .catch(() => setState("error"));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [db]);

  if (state === "ready") return <TeamWorkspace />;
  if (state === "loading") return <main className={styles.statePage}><LoaderCircle className={styles.spinner}/><strong>Opening your workspace</strong><p>Loading monitoring, ownership, and release decisions…</p></main>;
  if (state === "signed-out") return <WorkspaceGate />;
  return <main className={styles.statePage}><ShieldAlert/><strong>Workspace unavailable</strong><p>We could not verify your session. Your public security reports are still available.</p><div className={styles.stateActions}><Link href="/account?next=/workspace">Sign in again <ArrowRight/></Link><Link href="/registry">Open registry</Link></div></main>;
}

function WorkspaceGate() {
  return <main className={styles.gate}>
    <section className={styles.gateCopy}><span><i/> GuardRails workspace</span><h1>Keep every extension decision in one trusted place.</h1><p>Monitor exact releases, route meaningful changes to an owner, and keep the evidence behind every decision.</p><div className={styles.stateActions}><Link href="/account?next=/workspace">Create your workspace <ArrowRight/></Link><Link href="/registry">Explore public reports</Link></div><small>No credit card required · Public reports stay open</small></section>
    <section className={styles.gatePreview} aria-label="GuardRails workspace preview"><header><span>Your engineering workspace</span><em>All systems healthy</em></header><div className={styles.previewMetrics}><article><strong>3</strong><span>Need review</span></article><article><strong>38</strong><span>Monitored</span></article><article><strong>96%</strong><span>Current baselines</span></article></div><div className={styles.previewItem}><b>UP</b><div><strong>Extension update</strong><small>Reviewed version → New version</small></div><span>2 capabilities added</span><em>Review</em></div><div className={styles.previewItem}><b>BL</b><div><strong>Approved baseline</strong><small>Evidence and decision attached</small></div><span>No meaningful change</span><em className={styles.safe}>Ready</em></div></section>
  </main>;
}
