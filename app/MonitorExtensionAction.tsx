"use client";

import Link from "next/link";
import { BellRing, Check, ChevronRight, LoaderCircle, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { browserDb } from "@/lib/supabase";
import { trackProductEvent } from "@/lib/analyticsEvents";

type Team = { id: string; name: string; role: string };

export default function MonitorExtensionAction({ extensionId, version, scanId }: { extensionId: string; version: string; scanId: string }) {
  const db = useMemo(() => browserDb(), []);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamId, setTeamId] = useState("");
  const [state, setState] = useState<"loading" | "ready" | "signed-out" | "empty" | "saving" | "saved" | "error">("loading");
  const [message, setMessage] = useState("");
  const token = useCallback(async () => (await db?.auth.getSession())?.data.session?.access_token || "", [db]);

  useEffect(() => {
    void (async () => {
      const accessToken = await token();
      if (!accessToken) { setState("signed-out"); return; }
      const response = await fetch("/api/teams", { headers: { Authorization: `Bearer ${accessToken}` } });
      const body = await response.json().catch(() => ({})) as { teams?: Team[]; error?: string };
      const writable = response.ok && Array.isArray(body.teams) ? body.teams.filter((team) => ["owner", "admin", "analyst"].includes(team.role)) : [];
      setTeams(writable); setTeamId(writable[0]?.id || "");
      if (!response.ok) { setMessage(body.error || "Workspace choices could not be loaded."); setState("error"); }
      else setState(writable.length ? "ready" : "empty");
    })().catch(() => { setMessage("Workspace choices could not be loaded."); setState("error"); });
  }, [token]);

  async function enableMonitoring() {
    if (!teamId) return;
    setState("saving"); setMessage("");
    const accessToken = await token();
    const response = await fetch(`/api/teams/${encodeURIComponent(teamId)}/watchlist`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ extension_id: extensionId, baseline_scan_id: scanId }),
    });
    const body = await response.json().catch(() => ({})) as { error?: string };
    if (!response.ok) { setMessage(body.error || "Monitoring could not be enabled."); setState("error"); return; }
    trackProductEvent({ name: "watch_created", source_route: window.location.pathname, scope: "team" });
    setState("saved");
  }

  const workspaceHref = `/workspace?extension=${encodeURIComponent(extensionId)}`;
  if (state === "signed-out") return <Link className="monitorPrompt monitorPromptAction" href={`/account?next=${encodeURIComponent(workspaceHref)}`}><BellRing/><span><strong>Monitor the next release</strong><small>Create a free workspace to keep this exact version as your baseline.</small></span><ChevronRight/></Link>;
  if (state === "empty") return <Link className="monitorPrompt monitorPromptAction" href="/workspace"><BellRing/><span><strong>Create a workspace to monitor this extension</strong><small>Start with this completed report, then invite teammates when you are ready.</small></span><ChevronRight/></Link>;
  if (state === "saved") return <Link className="monitorPrompt monitorPromptSuccess" href={workspaceHref}><Check/><span><strong>Monitoring is on</strong><small>{extensionId}@{version} is your reviewed baseline. We will bring meaningful changes back for a decision.</small></span><ChevronRight/></Link>;
  return <aside className="monitorPrompt" aria-live="polite">
    <BellRing/>
    <div><span>Release monitor</span><strong>Keep this decision current.</strong><p>Save <code>{extensionId}@{version}</code> as your team&apos;s reviewed baseline. A new release is compared against this exact scan before it returns for review.</p>
      {state === "loading" ? <small><LoaderCircle className="spin"/> Loading workspaces…</small> : null}
      {state === "ready" || state === "saving" ? <div className="monitorPromptControls"><label>Monitor for<select aria-label="Workspace to monitor this extension" value={teamId} onChange={(event) => setTeamId(event.target.value)} disabled={state === "saving"}>{teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label><button className="button buttonDark" type="button" onClick={() => void enableMonitoring()} disabled={state === "saving"}>{state === "saving" ? <><LoaderCircle className="spin"/> Saving baseline</> : <><ShieldCheck/> Monitor this extension</>}</button></div> : null}
      {state === "error" ? <p className="actionError">{message}</p> : null}
    </div>
  </aside>;
}
