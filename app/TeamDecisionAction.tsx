"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckSquare } from "lucide-react";
import { browserDb } from "@/lib/supabase";

type Team = { id: string; name: string; role: string };

export default function TeamDecisionAction({ scanId, extensionId }: { scanId: string; extensionId: string }) {
  const db = useMemo(() => browserDb(), []);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamId, setTeamId] = useState("");
  const [decision, setDecision] = useState("review");
  const [state, setState] = useState<"hidden" | "ready" | "saving" | "saved" | "error">("hidden");
  const [watchState, setWatchState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const token = useCallback(async () => {
    const session = await db?.auth.getSession();
    return session?.data.session?.access_token || "";
  }, [db]);
  useEffect(() => {
    void (async () => {
      const accessToken = await token();
      if (!accessToken) return;
      const response = await fetch("/api/teams", { headers: { Authorization: `Bearer ${accessToken}` } });
      const body = await response.json();
      const available = Array.isArray(body.teams) ? body.teams.filter((team: Team) => ["owner", "admin", "analyst"].includes(team.role)) : [];
      if (response.ok && available.length) { setTeams(available); setTeamId(available[0].id); setState("ready"); }
    })();
  }, [token]);
  async function save() {
    if (!teamId) return;
    setState("saving");
    const accessToken = await token();
    const response = await fetch(`/api/teams/${encodeURIComponent(teamId)}/decisions`, { method: "POST", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ scan_id: scanId, decision }) });
    setState(response.ok ? "saved" : "error");
  }
  async function watch() {
    if (!teamId) return;
    setWatchState("saving"); const accessToken = await token();
    const response = await fetch(`/api/teams/${encodeURIComponent(teamId)}/watchlist`, { method: "POST", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ extension_id: extensionId }) });
    setWatchState(response.ok ? "saved" : "error");
  }
  if (state === "hidden") return null;
  if (state === "saved") return <span className="actionNotice" role="status">Team decision saved.</span>;
  return <div className="teamDecisionAction">
    <select aria-label="Team" value={teamId} onChange={(event) => setTeamId(event.target.value)}>{teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select>
    <select aria-label="Decision" value={decision} onChange={(event) => setDecision(event.target.value)}><option value="review">Review</option><option value="allow">Allow</option><option value="block">Block</option><option value="exception">Exception</option></select>
    <button className="button buttonQuiet" type="button" onClick={() => void save()} disabled={state === "saving"}><CheckSquare size={15}/>{state === "saving" ? "Saving" : "Save team decision"}</button>
    <button className="button buttonQuiet" type="button" onClick={() => void watch()} disabled={watchState === "saving" || watchState === "saved"}>{watchState === "saved" ? "Watching release" : watchState === "saving" ? "Adding watch" : "Watch release"}</button>
    {state === "error" ? <span className="actionError" role="status">Could not save the team decision.</span> : null}
    {watchState === "error" ? <span className="actionError" role="status">Could not add the team watch.</span> : null}
  </div>;
}
