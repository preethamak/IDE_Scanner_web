"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Radar, ShieldAlert, ShieldCheck } from "lucide-react";
import TeamWorkspace from "@/app/TeamWorkspace";
import { browserDb } from "@/lib/supabase";

export default function WorkspacePage() {
  const db = useMemo(() => browserDb(), []);
  const [state, setState] = useState<"loading" | "ready" | "signed-out" | "error">("loading");

  useEffect(() => {
    if (!db) { const timer = window.setTimeout(() => setState("error"), 0); return () => window.clearTimeout(timer); }
    const timer = window.setTimeout(() => { void db.auth.getUser().then(({ data }) => setState(data.user ? "ready" : "signed-out")).catch(() => setState("error")); }, 0);
    return () => window.clearTimeout(timer);
  }, [db]);

  if (state === "signed-out") return <Gate />;
  if (state === "error") return <main className="workspacePage"><section className="workspaceSignedOut"><ShieldAlert/><span>Workspace</span><h1>Your workspace is temporarily unavailable.</h1><p>Completed Analysis Reports remain available. Please refresh, or return to the Extension Registry while the workspace reconnects.</p><Link className="button buttonDark" href="/registry">Open Extension Registry <ArrowRight/></Link></section></main>;
  return <main className="workspacePage dashboardPage"><section className="workspaceHead dashboardHead"><div><span>Workspace · shared triage</span><h1>Evidence, ownership, and decisions in one queue.</h1><p>Every extension watch, delivery state, and decision is scoped to the selected team and recorded through the workspace API.</p></div><div className="workspaceActions"><Link className="button buttonDark" href="/monitor"><Radar/> Manage monitoring</Link><Link className="button buttonQuiet" href="/analyze">Analyze extension</Link></div></section>{state === "loading" ? <div className="workspaceMessage">Loading your security workspace…</div> : <TeamWorkspace />}</main>;
}

function Gate() {
  return <main className="workspacePage gatePage"><section className="workspaceSignedOut"><ShieldCheck/><span>Workspace · shared triage</span><h1>Turn extension changes into an evidence queue.</h1><p>Explore and inspect public artifacts without an account. Sign in only to watch releases, receive private alerts, and keep your team’s decisions together.</p><Link className="button buttonDark" href="/account?next=/workspace">Create free workspace <ArrowRight/></Link><Link className="textAction" href="/registry">Open Extension Registry <ArrowRight/></Link></section><section className="gatePreview" aria-label="Workspace workflow preview"><header><span>Workspace preview</span><strong>One queue, from release to decision</strong></header><div><article><i>01</i><Radar/><strong>Release detected</strong><p>A team watch creates a private event.</p></article><article><i>02</i><ShieldCheck/><strong>Exact artifact scanned</strong><p>Deep Scan records the artifact evidence.</p></article><article><i>03</i><ShieldAlert/><strong>Decision owned</strong><p>Assignments, due dates, and delivery state remain with the team.</p></article></div></section></main>;
}
