"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, ScanSearch } from "lucide-react";
import Link from "next/link";

type ScanState = "idle" | "loading" | "queued" | "running" | "complete" | "incomplete" | "error";

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
      fetch("/api/deep-scans/health", { cache: "no-store" }).then((response) => response.json()),
      fetch(`/api/deep-scans?extension_id=${encodeURIComponent(extensionId)}&version=${encodeURIComponent(version)}`, { cache: "no-store" }).then(async (response) => response.status === 204 ? null : response.status === 401 ? { auth_required: true } : response.json()),
    ]).then(([runner, job]) => {
      if (!active) return;
      setHealth(runner.available ? "available" : "unavailable");
      if (job?.auth_required) setSignedOut(true);
      else if (job?.report_url) {
        const terminal = job.status === "incomplete" ? "incomplete" : "complete";
        setReportUrl(String(job.report_url)); setState(terminal);
        setMessage(showReportLink ? terminal === "complete" ? "Completed Deep Scan is available for this exact release." : "The Deep Scan is incomplete. Review missing coverage before making a trust decision." : "");
      }
      else if (job && ["queued", "running"].includes(job.status)) {
        setJobId(String(job.id)); setState(job.status); setMessage(job.status === "queued" ? "Starting the isolated analysis runner…" : "Analyzers are inspecting the exact artifact.");
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
    if (health !== "available") return;
    if (signedOut) { router.push(`/account?next=${encodeURIComponent(window.location.pathname)}`); return; }
    const force = state === "complete" || state === "incomplete";
    setState("loading"); setMessage("");
    const response = await fetch("/api/deep-scans", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ extension_id: extensionId, version, force }) });
    const body = await response.json().catch(() => ({}));
    if (response.status === 401) { router.push(`/account?next=${encodeURIComponent(window.location.pathname)}`); return; }
    if (!response.ok) { setState("error"); setMessage(body.error || "Deep Scan is temporarily unavailable."); return; }
    if (body.status === "complete") { setState("complete"); setReportUrl(String(body.report_url || `/extensions/${encodeURIComponent(extensionId)}/versions/${encodeURIComponent(version)}`)); setMessage("A completed Deep Scan already exists for this version."); router.refresh(); return; }
    setJobId(String(body.id || "")); setState(body.status === "running" ? "running" : "queued"); setMessage("Runner started. Preparing the exact published artifact for analysis.");
  }

  const unavailable = health === "unavailable";
  return <div className="deepScanAction">
    <button className="button buttonDark" onClick={queue} disabled={health !== "available" || ["loading", "queued", "running"].includes(state)}>
      {health === "checking" ? <><LoaderCircle className="spin" size={16}/> Checking runner</> : unavailable ? "Deep Scan paused" : signedOut ? <>Sign in to Deep Scan <ScanSearch size={16}/></> : state === "loading" ? <><LoaderCircle className="spin" size={16}/> Queueing</> : state === "queued" ? "Queued" : state === "running" ? <><LoaderCircle className="spin" size={16}/> Analyzing</> : ["complete", "incomplete"].includes(state) ? <>Run a new scan <ScanSearch size={16}/></> : <>Deep Scan <ScanSearch size={16}/></>}
    </button>
    {showReportLink && reportUrl ? <Link className="deepScanReportLink" href={reportUrl}>Open Deep Scan report</Link> : null}
    {unavailable ? <span className="actionError" role="status">The analysis runner is offline. No scan job was created.</span> : message ? <span className={state === "error" ? "actionError" : "actionNotice"} role="status">{message}</span> : null}
  </div>;
}
