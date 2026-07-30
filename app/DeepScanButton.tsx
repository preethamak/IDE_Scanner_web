"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, ScanSearch } from "lucide-react";
import Link from "next/link";
import { trackProductEvent } from "@/lib/analyticsEvents";

type ScanState = "idle" | "loading" | "queued" | "running" | "complete" | "incomplete" | "error";
type Health = { available?: boolean };
type ExistingJob = { auth_required?: boolean; report_url?: string; status?: string; id?: string; error?: string } | null;

async function fetchJson<T>(url: string, timeoutMs = 2_000): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { cache: "no-store", signal: controller.signal });
    if (!response.ok) throw new Error(`Request failed with ${response.status}`);
    return await response.json() as T;
  } finally {
    window.clearTimeout(timeout);
  }
}

async function fetchExistingJob(extensionId: string, version: string): Promise<ExistingJob> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 2_000);
  try {
    const response = await fetch(`/api/deep-scans?extension_id=${encodeURIComponent(extensionId)}&version=${encodeURIComponent(version)}`, { cache: "no-store", signal: controller.signal });
    if (response.status === 204) return null;
    if (response.status === 401) return { auth_required: true };
    if (!response.ok) return null;
    return await response.json() as ExistingJob;
  } catch {
    return null;
  } finally {
    window.clearTimeout(timeout);
  }
}

export default function DeepScanButton({ extensionId, version, showReportLink = true }: { extensionId: string; version: string; showReportLink?: boolean }) {
  const router = useRouter();
  const [state, setState] = useState<ScanState>("idle");
  const [health, setHealth] = useState<"checking" | "available" | "unavailable">("checking");
  const [message, setMessage] = useState("");
  const [jobId, setJobId] = useState("");
  const [reportUrl, setReportUrl] = useState("");
  const [signedOut, setSignedOut] = useState(false);

  useEffect(() => {
    let active = true;
    void Promise.all([
      fetchJson<Health>("/api/deep-scans/health"),
      fetchExistingJob(extensionId, version),
    ]).then(([runner, job]) => {
      if (!active) return;
      setHealth(runner.available ? "available" : "unavailable");
      if (job?.auth_required) setSignedOut(true);
      else if (job?.report_url) {
        const terminal = job.status === "incomplete" ? "incomplete" : "complete";
        setReportUrl(String(job.report_url)); setState(terminal);
        setMessage(showReportLink ? terminal === "complete" ? "Completed Deep Scan is available for this exact release." : "The Deep Scan is incomplete. Review missing coverage before making a trust decision." : "");
      }
      else if (job?.status === "queued" || job?.status === "running") {
        const nextState: ScanState = job.status;
        setJobId(String(job.id || "")); setState(nextState); setMessage(nextState === "queued" ? "Starting the isolated analysis runner…" : "Analyzers are inspecting the exact artifact.");
      } else if (job?.status === "failed") {
        setState("error"); setMessage(job.error || "The previous Deep Scan failed. Retry when the runner is available.");
      }
    }).catch(() => { if (active) setHealth("unavailable"); });
    return () => { active = false; };
  }, [extensionId, version, showReportLink]);

  useEffect(() => {
    if (!jobId || !["queued", "running"].includes(state)) return;
    const startedAt = Date.now();
    const timer = window.setInterval(async () => {
      let response: Response;
      let body: { status?: string; report_url?: string; error?: string };
      try {
        response = await fetch(`/api/deep-scans/${jobId}`, { cache: "no-store" });
        body = await response.json();
      } catch { return; } // transient network blip: keep polling, the server reconciles stale jobs to a terminal state
      if (!response.ok) { setState("error"); setMessage(body.error || "Scan progress is unavailable."); window.clearInterval(timer); return; }
      if (["complete", "incomplete"].includes(String(body.status))) {
        const terminal = body.status === "incomplete" ? "incomplete" : "complete";
        setState(terminal); setReportUrl(String(body.report_url || `/extensions/${encodeURIComponent(extensionId)}/versions/${encodeURIComponent(version)}`));
        setMessage(terminal === "complete" ? "Deep Scan complete. Exact-version intelligence is ready." : "Deep Scan incomplete. Review the missing coverage and scan again before making a trust decision.");
        window.clearInterval(timer); router.refresh();
      }
      else if (body.status === "failed") { setState("error"); setMessage(body.error || "Deep Scan failed. Retry when the runner is available."); window.clearInterval(timer); }
      else {
        const nextState = body.status === "running" ? "running" : "queued";
        setState(nextState);
        // The runner is best-effort and can take a few minutes to start. Reassure
        // the user instead of leaving a silent spinner; the poll still resolves to
        // a terminal state on its own once the job passes its deadline.
        const waited = Date.now() - startedAt;
        if (waited > 120_000) setMessage(nextState === "running" ? "Still analyzing the exact artifact — larger extensions take a few minutes." : "Waiting for an available runner. This resolves automatically; you can safely leave this page.");
        else setMessage(nextState === "running" ? "Analyzers are inspecting the exact artifact." : "Starting the isolated analysis runner…");
      }
    }, 5000);
    return () => window.clearInterval(timer);
  }, [jobId, state, router, extensionId, version]);

  async function queue() {
    if (signedOut) {
      trackProductEvent({ name: "workspace_signup_started", source_route: window.location.pathname, entry_point: "deep_scan" });
      const next = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      router.push(`/account?next=${encodeURIComponent(next)}`);
      return;
    }
    if (health !== "available") return;
    const force = state === "complete" || state === "incomplete";
    setState("loading"); setMessage("");
    const response = await fetch("/api/deep-scans", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ extension_id: extensionId, version, force }) });
    const body = await response.json().catch(() => ({}));
    if (response.status === 401) {
      trackProductEvent({ name: "workspace_signup_started", source_route: window.location.pathname, entry_point: "deep_scan" });
      const next = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      router.push(`/account?next=${encodeURIComponent(next)}`);
      return;
    }
    if (!response.ok) { setState("error"); setMessage(body.error || "Deep Scan is temporarily unavailable."); return; }
    if (body.status === "complete") { setState("complete"); setReportUrl(String(body.report_url || `/extensions/${encodeURIComponent(extensionId)}/versions/${encodeURIComponent(version)}`)); setMessage("A completed Deep Scan already exists for this version."); router.refresh(); return; }
    setJobId(String(body.id || "")); setState(body.status === "running" ? "running" : "queued"); setMessage("Runner started. Preparing the exact published artifact for analysis.");
  }

  const unavailable = health === "unavailable";
  return <div className="deepScanAction">
    <button className="button buttonDark" onClick={queue} disabled={(!signedOut && health !== "available") || ["loading", "queued", "running"].includes(state)}>
      {signedOut ? <>Create free workspace to Deep Scan <ScanSearch size={16}/></> : health === "checking" ? <><LoaderCircle className="spin" size={16}/> Checking runner</> : unavailable ? "Deep Scan paused" : state === "loading" ? <><LoaderCircle className="spin" size={16}/> Queueing</> : state === "queued" ? "Queued" : state === "running" ? <><LoaderCircle className="spin" size={16}/> Analyzing</> : ["complete", "incomplete"].includes(state) ? <>Run a new scan <ScanSearch size={16}/></> : <>Deep Scan <ScanSearch size={16}/></>}
    </button>
    {signedOut ? <span className="actionNotice" role="status">Free workspaces save exact-version reports, monitoring, and your review queue.</span> : null}
    {showReportLink && reportUrl ? <Link className="deepScanReportLink" href={reportUrl}>Open Deep Scan report</Link> : null}
    {unavailable ? <span className="actionError" role="status">The analysis runner is offline. No scan job was created.</span> : message ? <span className={state === "error" ? "actionError" : "actionNotice"} role="status">{message}</span> : null}
  </div>;
}
