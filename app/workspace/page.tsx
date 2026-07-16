"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, BellRing, CheckCheck, Clock3, Radar, ShieldAlert, ShieldCheck } from "lucide-react";
import { browserDb } from "@/lib/supabase";

type Alert = { id: string; extension_id: string; version: string; scan_id?: string | null; kind: string; severity?: string | null; state: string; title: string; summary: string; created_at: string };
type Job = { id: string; extension_id: string; version: string; status: string; created_at: string };

export default function DashboardPage() {
  const db = useMemo(() => browserDb(), []);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "signed-out" | "error">("loading");

  const load = useCallback(async () => {
    if (!db) return setState("error");
    const { data: { user } } = await db.auth.getUser();
    if (!user) return setState("signed-out");
    const [alertResult, jobResult] = await Promise.all([
      db.from("monitoring_alerts").select("id,extension_id,version,scan_id,kind,severity,state,title,summary,created_at").in("state", ["unread", "read", "acknowledged"]).order("created_at", { ascending: false }).limit(30),
      db.from("scan_jobs").select("id,extension_id,version,status,created_at").order("created_at", { ascending: false }).limit(8),
    ]);
    if (alertResult.error || jobResult.error) return setState("error");
    setAlerts(alertResult.data || []); setJobs(jobResult.data || []); setState("ready");
  }, [db]);
  useEffect(() => { void load(); }, [load]);

  async function resolve(id: string, state: "read" | "acknowledged" | "dismissed") {
    if (!db) return;
    const now = new Date().toISOString();
    const result = await db.from("monitoring_alerts").update({ state, read_at: state === "read" ? now : undefined, resolved_at: state === "acknowledged" || state === "dismissed" ? now : undefined }).eq("id", id);
    if (!result.error) await load();
  }

  if (state === "signed-out") return <Gate />;
  if (state === "error") return <main className="workspacePage"><section className="workspaceSignedOut"><ShieldAlert/><span>Personal dashboard</span><h1>Your dashboard is temporarily unavailable.</h1><p>Public reports remain available. Please refresh, or return to Explore while the workspace reconnects.</p><Link className="button buttonDark" href="/catalog">Explore public intelligence <ArrowRight/></Link></section></main>;

  const unread = alerts.filter((item) => item.state === "unread");
  const urgent = alerts.filter((item) => item.state === "unread" && ["CRITICAL", "HIGH"].includes(item.severity || ""));
  return <main className="workspacePage dashboardPage">
    <section className="workspaceHead dashboardHead"><div><span>Dashboard · personal triage</span><h1>What needs your attention now.</h1><p>New watched releases, completed evidence, and incomplete scans in one short, actionable queue.</p></div><div className="workspaceActions"><Link className="button buttonDark" href="/monitor"><Radar/> Manage monitoring</Link><Link className="button buttonQuiet" href="/scan">Analyze extension</Link></div></section>
    {state === "loading" ? <div className="workspaceMessage">Loading your security queue…</div> : null}
    <section className="dashboardSummary" aria-label="Dashboard summary"><article><BellRing/><div><span>Unread</span><strong>{unread.length}</strong></div><p>Events awaiting a decision</p></article><article><ShieldAlert/><div><span>High priority</span><strong>{urgent.length}</strong></div><p>Severity-led review, not vulnerability claims</p></article><article><Clock3/><div><span>Processing</span><strong>{jobs.filter((job) => ["queued", "running"].includes(job.status)).length}</strong></div><p>Deep Scans currently in flight</p></article></section>
    <section className="workspaceSection attentionQueue"><div className="workspaceSectionHead"><div><span>Attention queue</span><h2>Evidence that changed</h2></div>{unread.length ? <button className="textAction" onClick={() => Promise.all(unread.map((item) => resolve(item.id, "read"))).then(() => undefined)}><CheckCheck/> Mark all read</button> : null}</div>
      <div className="alertRows">{alerts.map((alert) => <article key={alert.id} className={`monitorAlert ${alert.state} severity-${String(alert.severity || "INFORMATIONAL").toLowerCase()}`}><div className="alertSeverity">{alert.severity || "INFORMATIONAL"}</div><div><span>{labelFor(alert.kind)}</span><h3>{alert.title}</h3><p>{alert.summary}</p><small>{formatDate(alert.created_at)} · {alert.extension_id}@{alert.version}</small></div><div className="alertActions"><Link href={`/extensions/${encodeURIComponent(alert.extension_id)}/versions/${encodeURIComponent(alert.version)}`}>Open evidence <ArrowRight/></Link>{alert.state !== "acknowledged" ? <button onClick={() => void resolve(alert.id, "acknowledged")}>Acknowledge</button> : <span>ACKNOWLEDGED</span>}<button onClick={() => void resolve(alert.id, "dismissed")}>Dismiss</button></div></article>)}{state === "ready" && !alerts.length ? <Empty title="Nothing needs attention" detail="Watch an extension to receive a release event, then a follow-up scan result with its exact evidence." href="/catalog"/> : null}</div>
    </section>
    <section className="workspaceSection"><div className="workspaceSectionHead"><div><span>Recent analysis</span><h2>Deep Scan activity</h2></div><Link className="textAction" href="/monitor">Open monitoring <ArrowRight/></Link></div><div className="personalScanRows">{jobs.map((job) => <article key={job.id}><Status value={job.status}/><div><strong>{job.extension_id}</strong><code>@{job.version}</code></div><span>{formatDate(job.created_at)}</span><Link href={`/extensions/${encodeURIComponent(job.extension_id)}/versions/${encodeURIComponent(job.version)}`}>Open report <ArrowRight/></Link></article>)}</div></section>
  </main>;
}

function Gate() { return <main className="workspacePage gatePage"><section className="workspaceSignedOut"><ShieldCheck/><span>Dashboard · personal triage</span><h1>Turn extension changes into an evidence queue.</h1><p>Explore and inspect public artifacts without an account. Sign in only to watch releases, receive private alerts, and keep your decisions together.</p><Link className="button buttonDark" href="/account?next=/workspace">Create free workspace <ArrowRight/></Link><Link className="textAction" href="/catalog">Explore public intelligence <ArrowRight/></Link></section><section className="gatePreview" aria-label="Dashboard workflow preview"><header><span>Workspace preview</span><strong>One queue, from release to decision</strong></header><div><article><i>01</i><BellRing/><strong>Release detected</strong><p>A watched registry version creates a private event.</p></article><article><i>02</i><Radar/><strong>Exact artifact scanned</strong><p>Deep Scan runs automatically and records coverage.</p></article><article><i>03</i><CheckCheck/><strong>Evidence triaged</strong><p>Open, acknowledge, or dismiss with history intact.</p></article></div></section></main>; }
function Status({ value }: { value: string }) { return <span className={`scanJobStatus ${value}`}>{value}</span>; }
function Empty({ title, detail, href }: { title: string; detail: string; href: string }) { return <div className="workspaceEmpty"><ShieldCheck/><strong>{title}</strong><p>{detail}</p><Link href={href}>Explore extensions <ArrowRight/></Link></div>; }
function formatDate(value: string) { return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(value)); }
function labelFor(kind: string) { return ({ release_detected: "New release", review_required: "Review required", confirmed_threat: "Confirmed threat", coverage_incomplete: "Coverage incomplete", scan_completed: "Scan complete", scan_failed: "Scan failed" } as Record<string, string>)[kind] || "Monitoring update"; }
