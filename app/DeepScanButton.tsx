"use client";
import { useState } from "react";
import { LoaderCircle, ScanSearch } from "lucide-react";

export default function DeepScanButton({ extensionId, version }: { extensionId: string; version: string }) {
  const [state, setState] = useState<"idle"|"loading"|"queued"|"error">("idle");
  const [message, setMessage] = useState("");
  async function queue() {
    setState("loading");
    const response = await fetch("/api/deep-scans", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ extension_id: extensionId, version }) });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) { setState("error"); setMessage(body.error || "Deep Scan could not be queued."); return; }
    setState("queued"); setMessage("Deep Scan queued. This page will show the permanent result when processing completes.");
  }
  return <div className="deepScanAction"><button className="button buttonDark" onClick={queue} disabled={state === "loading" || state === "queued"}>{state === "loading" ? <><LoaderCircle className="spin" size={16}/> Queueing</> : state === "queued" ? "Queued" : <>Deep Scan <ScanSearch size={16}/></>}</button>{message ? <span className={state === "error" ? "actionError" : "actionNotice"}>{message}</span> : null}</div>;
}
