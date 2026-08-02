"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BadgeCheck, Radar, ShieldAlert, ShieldCheck, UserRound } from "lucide-react";
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
  return <main className="workspacePage dashboardPage"><section className="workspaceHead dashboardHead"><div><span>Workspace · shared triage</span><h1>Evidence, ownership, and decisions in one queue.</h1><p>Every extension watch, delivery state, and decision is scoped to the selected team and recorded through the workspace API.</p></div><div className="workspaceActions"><Link className="button buttonDark" href="/monitor"><Radar/> Manage monitoring</Link><Link className="button buttonQuiet" href="/registry">Open Extension Registry</Link></div></section>{state === "loading" ? <div className="workspaceMessage">Loading your security workspace…</div> : <TeamWorkspace />}</main>;
}

function Gate() {
  return <main className="workspacePage workspaceGateway"><section className="workspaceGatewayIntro"><span>Team workspace</span><h1>Keep risky extension updates from reaching your team unnoticed.</h1><p>Assign reviews, record approval decisions, and alert the right people when an extension your team follows publishes a new version.</p><div className="workspaceGatewayActions"><Link className="button buttonDark" href="/account?next=/workspace">Create team workspace <ArrowRight/></Link><Link className="button buttonQuiet" href="/registry">Explore Extension Registry</Link></div><small>Public Security Summaries stay available without an account.</small></section><section className="workspaceQueuePreview" aria-label="Example team decision queue"><header><div><span>Workspace preview</span><h2>Your team’s next decisions</h2></div><p>Monitor brings new releases here. Your team decides what happens next.</p></header><div className="workspacePreviewRows"><article><span className="previewStatus review">Review needed</span><div><strong>GitHub Copilot <code>@1.388.0</code></strong><p>New version needs a team decision before approval.</p></div><span className="previewOwner"><UserRound/> Assigned to Priya</span><span className="previewDue">Due today</span></article><article><span className="previewStatus allow">Approved</span><div><strong>Docker <code>@2.0.0</code></strong><p>Completed analysis found no known concern.</p></div><span className="previewOwner"><BadgeCheck/> Recorded by Marco</span><span className="previewDue">Complete</span></article><article><span className="previewStatus watch">Watching</span><div><strong>Python <code>@2026.5</code></strong><p>Waiting for the next Marketplace release.</p></div><span className="previewOwner"><Radar/> Team watch</span><span className="previewDue">Active</span></article></div><footer><ShieldCheck/><span>Every decision keeps its exact version and public Security Summary connected.</span></footer></section></main>;
}
