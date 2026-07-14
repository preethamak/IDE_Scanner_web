"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, ScanSearch } from "lucide-react";

type ScanState = "idle" | "loading" | "queued" | "running" | "complete" | "error";

export default function DeepScanButton({ extensionId, version }: { extensionId: string; version: string }) {
  const router = useRouter();
  const [state, setState] = useState<ScanState>("idle");
  const [health, setHealth] = useState<"checking" | "available" | "unavailable">("checking");
  const [message, setMessage] = useState("");
  const [jobId, setJobId] = useState("");

  useEffect(() => {
    let active = true;
    void Promise.all([
      fetch("/api/deep-scans/health", { cache: "no-store" }).then((response) => response.json()),
      fetch(`/api/deep-scans?extension_id=${encodeURIComponent(extensionId)}&version=${encodeURIComponent(version)}`, { cache: "no-store" }).then(async (response) => response.status === 204 || response.status === 401 ? null : response.json()),
    ]).then(([runner, job]) => {
      if (!active) return;
      setHealth(runner.available ? "available" : "unavailable");
      if (job && ["queued", "running"].includes(job.status)) {
        setJobId(String(job.id)); setState(job.status); setMessage(job.status === "queued" ? "Queued for the next analysis runner." : "Analyzers are inspecting the exact artifact.");
      } else if (job?.status === "failed") {
        setState("error"); setMessage(job.error || "The previous Deep Scan failed. Retry when the runner is available.");
      }
    }).catch(() => { if (active) setHealth("unavailable"); });
    return () => { active = false; };
  }, [extensionId, version]);

  useEffect(() => {
    if (!jobId || !["queued", "running"].includes(state)) return;
    const timer = window.setInterval(async () => {
      const response = await fetch(`/api/deep-scans/${jobId}`, { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) { setState("error"); setMessage(body.error || "Scan progress is unavailable."); window.clearInterval(timer); return; }
      if (["complete", "incomplete"].includes(body.status)) { setState("complete"); setMessage("Deep Scan complete. Exact-version intelligence is ready."); window.clearInterval(timer); router.refresh(); }
      else if (body.status === "failed") { setState("error"); setMessage(body.error || "Deep Scan failed. Retry when the runner is available."); window.clearInterval(timer); }
      else { setState(body.status === "running" ? "running" : "queued"); }
    }, 5000);
    return () => window.clearInterval(timer);
  }, [jobId, state, router]);

  async function queue() {
    if (health !== "available") return;
    setState("loading"); setMessage("");
    const response = await fetch("/api/deep-scans", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ extension_id: extensionId, version }) });
    const body = await response.json().catch(() => ({}));
    if (response.status === 401) { router.push(`/account?next=${encodeURIComponent(window.location.pathname)}`); return; }
    if (!response.ok) { setState("error"); setMessage(body.error || "Deep Scan is temporarily unavailable."); return; }
    if (body.status === "complete") { setState("complete"); setMessage("A completed Deep Scan already exists for this version."); router.refresh(); return; }
    setJobId(String(body.id || "")); setState(body.status === "running" ? "running" : "queued"); setMessage("Queued. The free analysis runner checks for work every five minutes.");
  }

  const unavailable = health === "unavailable";
  return <div className="deepScanAction">
    <button className="button buttonDark" onClick={queue} disabled={health !== "available" || ["loading", "queued", "running", "complete"].includes(state)}>
      {health === "checking" ? <><LoaderCircle className="spin" size={16}/> Checking runner</> : unavailable ? "Deep Scan paused" : state === "loading" ? <><LoaderCircle className="spin" size={16}/> Queueing</> : state === "queued" ? "Queued" : state === "running" ? <><LoaderCircle className="spin" size={16}/> Analyzing</> : state === "complete" ? "Deep Scan complete" : <>Deep Scan <ScanSearch size={16}/></>}
    </button>
    {unavailable ? <span className="actionError">The analysis runner is offline. No scan job was created.</span> : message ? <span className={state === "error" ? "actionError" : "actionNotice"}>{message}</span> : null}
  </div>;
}
