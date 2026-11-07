"use client";

import Link from "next/link";
import { BellRing, Check, ChevronRight, LoaderCircle, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { browserDb } from "@/lib/supabase";
import { trackProductEvent } from "@/lib/analyticsEvents";
import { browserAuthHeaders } from "@/lib/browserAuth";
import { assertExactWatchBaseline, monitorWorkspaceHref } from "@/lib/releaseReviewIntent";

type Team = { id: string; name: string; role: string };

export default function MonitorExtensionAction({ extensionId, version, scanId }: { extensionId: string; version: string; scanId: string }) {
  const db = useMemo(() => browserDb(), []);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamId, setTeamId] = useState("");
  const [state, setState] = useState<"loading" | "ready" | "signed-out" | "empty" | "saving" | "saved" | "error">("loading");
  const [message, setMessage] = useState("");
  const [loadAttempt, setLoadAttempt] = useState(0);
  const token = useCallback(async () => browserAuthHeaders(db), [db]);

  useEffect(() => {
    void (async () => {
      const headers = await token();
      if (!headers.Authorization) { setState("signed-out"); return; }
      const response = await fetch("/api/teams", { headers });
      const body = await response.json().catch(() => ({})) as { teams?: Team[]; error?: string };
      const writable = response.ok && Array.isArray(body.teams) ? body.teams.filter((team) => ["owner", "admin", "analyst"].includes(team.role)) : [];
      setTeams(writable); setTeamId(writable[0]?.id || "");
      if (!response.ok) { setMessage(body.error || "Workspace choices could not be loaded."); setState("error"); }
      else setState(writable.length ? "ready" : "empty");
    })().catch(() => { setMessage("Workspace choices could not be loaded."); setState("error"); });
  }, [token, loadAttempt]);

  async function enableMonitoring() {
    if (!teamId) return;
    setState("saving"); setMessage("");
    try {
      const headers = await token();
      if (!headers.Authorization) throw new Error("Your session expired. Sign in again before retrying.");
      const response = await fetch(`/api/teams/${encodeURIComponent(teamId)}/watchlist`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ extension_id: extensionId, version, baseline_scan_id: scanId }),
      });
      const body = await response.json().catch(() => ({})) as Record<string, unknown>;
      if (!response.ok) throw new Error(String(body.error || "Monitoring could not be enabled."));
      assertExactWatchBaseline(body, { extensionId, version, scanId });
      trackProductEvent({ name: "watch_created", source_route: window.location.pathname, scope: "team" });
      setState("saved");
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Monitoring could not be enabled. Your selected release is preserved.");
      setState("error");
    }
  }

  const workspaceHref = monitorWorkspaceHref({ extensionId, version, scanId });
  if (state === "signed-out") return <Link className="monitorPrompt monitorPromptAction" href={`/account?next=${encodeURIComponent(workspaceHref)}`}><BellRing/><span><strong>Monitor the next release</strong><small>Create a free workspace to keep this exact version as your baseline.</small></span><ChevronRight/></Link>;
  if (state === "empty") return <Link className="monitorPrompt monitorPromptAction" href={workspaceHref}><BellRing/><span><strong>Create a workspace to monitor this extension</strong><small>Start with this completed report, then invite teammates when you are ready.</small></span><ChevronRight/></Link>;
  if (state === "saved") return <Link className="monitorPrompt monitorPromptSuccess" href={workspaceHref}><Check/><span><strong>Monitoring is on</strong><small>{extensionId}@{version} is your monitoring baseline. Scheduled registry checks will surface new releases.</small></span><ChevronRight/></Link>;
  return <aside className="monitorPrompt" aria-live="polite">
    <BellRing/>
    <div><span>Release monitor</span><strong>Keep this release in view.</strong><p>Save <code>{extensionId}@{version}</code> as your team&apos;s monitoring baseline. Scheduled registry checks surface new releases. Analyze their packages to compare evidence against this exact scan.</p>
      {state === "loading" ? <small><LoaderCircle className="spin"/> Loading workspaces…</small> : null}
      {state === "ready" || state === "saving" || (state === "error" && teams.length > 0) ? <div className="monitorPromptControls"><label>Monitor for<select aria-label="Workspace to monitor this extension" value={teamId} onChange={(event) => setTeamId(event.target.value)} disabled={state === "saving"}>{teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label><button className="button buttonDark" type="button" onClick={() => void enableMonitoring()} disabled={state === "saving"}>{state === "saving" ? <><LoaderCircle className="spin"/> Saving baseline</> : <><ShieldCheck/> Monitor this extension</>}</button></div> : null}
      {state === "error" ? <p className="actionError" role="alert">{message}{!teams.length ? <button type="button" onClick={() => { setState("loading"); setMessage(""); setLoadAttempt((attempt) => attempt + 1); }}>Retry loading workspaces</button> : null}</p> : null}
    </div>
  </aside>;
}
