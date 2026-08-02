"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { ArrowRight, Bell, Check, MessageSquare, ShieldCheck } from "lucide-react";
import TeamWorkspace from "@/app/TeamWorkspace";
import { browserDb } from "@/lib/supabase";

export default function MonitorPage() {
  return <Suspense fallback={<main className="workspacePage"><div className="workspaceMessage">Loading monitoring…</div></main>}><MonitorPageContent /></Suspense>;
}

function MonitorPageContent() {
  const db = useMemo(() => browserDb(), []);
  const [state, setState] = useState<"loading" | "ready" | "signed-out" | "error">("loading");
  const [extension, setExtension] = useState("");
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const timer = window.setTimeout(() => setExtension(params.get("extension") || ""), 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (!db) { const timer = window.setTimeout(() => setState("error"), 0); return () => window.clearTimeout(timer); }
    void db.auth.getUser().then(({ data }) => setState(data.user ? "ready" : "signed-out")).catch(() => setState("error"));
  }, [db]);

  if (state === "signed-out") return <Gate />;
  if (state === "error") return <main className="workspacePage"><section className="workspaceSignedOut"><Bell/><span>Monitor</span><h1>Monitoring is temporarily unavailable.</h1><p>Please refresh shortly. Public reports are unaffected.</p></section></main>;
  return <main className="workspacePage monitorPage"><section className="workspaceHead"><div><span>Monitor releases</span><h1>Follow extensions after approval.</h1><p>When an extension publishes a new version, your team can review the update and decide what to do next.</p></div><div className="workspaceActions"><Link className="button buttonDark" href="/registry">Find an extension <ArrowRight/></Link><Link className="button buttonQuiet" href="/workspace">Open dashboard</Link></div></section>{state === "loading" ? <div className="workspaceMessage">Loading monitoring…</div> : <><section className="monitorHow"><span>How monitoring works</span><ol><li><strong>Detect</strong><p>We notice a newly published version.</p></li><li><strong>Check</strong><p>A security scan reviews that version.</p></li><li><strong>Decide</strong><p>Your team gets the report and decides what to do next.</p></li></ol></section><TeamWorkspace initialExtension={extension} focus="monitor" /></>}</main>;
}

function Gate() { return <main className="workspacePage gatePage"><section className="workspaceSignedOut"><Bell/><span>Monitor · release tracking</span><h1>Watch the release. We do the next scan.</h1><p>Free sign-in unlocks shared release watches, exact-version analysis, a private evidence queue, and optional Slack delivery. Public reports remain open to everyone.</p><Link className="button buttonDark" href="/account?next=/monitor">Create free workspace <ArrowRight/></Link></section><section className="gatePreview monitorGatePreview" aria-label="Monitoring workflow preview"><header><span>Release monitor</span><strong>A return loop with an observable state</strong></header><div><article><i>WATCHING</i><Check/><strong>Registry polling active</strong><p>Marketplace and Open VSX releases are checked on schedule.</p></article><article><i>QUEUED</i><ShieldCheck/><strong>Deep Scan follows change</strong><p>The new version gets its own artifact hash and report.</p></article><article><i>DELIVERED</i><MessageSquare/><strong>Dashboard + Slack</strong><p>Only evidence meeting the team threshold leaves the product.</p></article></div></section></main>; }
