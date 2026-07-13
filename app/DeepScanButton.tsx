"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, ScanSearch } from "lucide-react";

export default function DeepScanButton({ extensionId, version }: { extensionId: string; version: string }) {
  const router=useRouter(); const [state, setState] = useState<"idle"|"loading"|"queued"|"running"|"complete"|"error">("idle");
  const [message, setMessage] = useState("");
  const [jobId,setJobId]=useState("");
  useEffect(()=>{if(!jobId||!["queued","running"].includes(state))return;const timer=window.setInterval(async()=>{const response=await fetch(`/api/deep-scans/${jobId}`,{cache:"no-store"});const body=await response.json();if(!response.ok){setState("error");setMessage(body.error||"Scan progress is unavailable.");return}if(body.status==="complete"||body.status==="incomplete"){setState("complete");setMessage("Deep Scan complete. Opening exact-version intelligence.");window.clearInterval(timer);router.refresh()}else if(body.status==="failed"){setState("error");setMessage(body.error||"Deep Scan failed. Retry when the runner is available.")}else setState(body.status==="running"?"running":"queued")},2500);return()=>window.clearInterval(timer)},[jobId,state,router]);
  async function queue() {
    setState("loading");
    const response = await fetch("/api/deep-scans", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ extension_id: extensionId, version }) });
    const body = await response.json().catch(() => ({}));
    if (response.status===401){router.push(`/account?next=${encodeURIComponent(window.location.pathname)}`);return} if (!response.ok) { setState("error"); setMessage(body.error || "Deep Scan is temporarily unavailable."); return; }
    if(body.status==="complete"){setState("complete");setMessage("A completed Deep Scan already exists for this version.");router.refresh();return} setJobId(String(body.id||""));setState(body.status==="running"?"running":"queued"); setMessage("Deep Scan queued. Analyzer progress will update here.");
  }
  return <div className="deepScanAction"><button className="button buttonDark" onClick={queue} disabled={["loading","queued","running","complete"].includes(state)}>{state === "loading" ? <><LoaderCircle className="spin" size={16}/> Queueing</> : state === "queued" ? "Queued" : state==="running"?<><LoaderCircle className="spin" size={16}/> Analyzing</>:state==="complete"?"Deep Scan complete":<>Deep Scan <ScanSearch size={16}/></>}</button>{message ? <span className={state === "error" ? "actionError" : "actionNotice"}>{message}</span> : null}</div>;
}
