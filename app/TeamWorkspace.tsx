"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Plus, Users } from "lucide-react";
import { browserDb } from "@/lib/supabase";

type Team = { id: string; name: string; slug: string; role: string };
type Alert = { id: string; title: string; summary: string; severity: string | null; state: string; extension_id: string; version: string };

export default function TeamWorkspace() {
  const db = useMemo(() => browserDb(), []);
  const [teams, setTeams] = useState<Team[]>([]);
  const [name, setName] = useState("");
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [activeTeamId, setActiveTeamId] = useState("");
  const [alerts, setAlerts] = useState<Alert[]>([]);

  async function token() {
    const session = await db?.auth.getSession();
    return session?.data.session?.access_token || "";
  }
  async function load() {
    const accessToken = await token();
    if (!accessToken) return;
    const response = await fetch("/api/teams", { headers: { Authorization: `Bearer ${accessToken}` } });
    const body = await response.json();
    if (!response.ok) { setError(String(body.error || "Team workspace is unavailable.")); setState("error"); return; }
    const available = Array.isArray(body.teams) ? body.teams : [];
    setTeams(available); setActiveTeamId((current) => current || available[0]?.id || ""); setState("ready");
  }
  useEffect(() => { void load(); }, []);
  async function create(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim(); if (!trimmed) return;
    setError(""); const accessToken = await token();
    const response = await fetch("/api/teams", { method: "POST", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ name: trimmed }) });
    const body = await response.json();
    if (!response.ok) { setError(String(body.error || "Team creation failed.")); return; }
    setName(""); setTeams((current) => [body, ...current]); setActiveTeamId(body.id);
  }
  useEffect(() => {
    if (!activeTeamId) { setAlerts([]); return; }
    void (async () => {
      const accessToken = await token();
      const response = await fetch(`/api/teams/${encodeURIComponent(activeTeamId)}/alerts`, { headers: { Authorization: `Bearer ${accessToken}` } });
      const body = await response.json();
      if (response.ok) setAlerts(Array.isArray(body.alerts) ? body.alerts : []);
    })();
  }, [activeTeamId]);
  async function acknowledge(alert: Alert) {
    const accessToken = await token();
    const response = await fetch(`/api/teams/${encodeURIComponent(activeTeamId)}/alerts`, { method: "PATCH", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ alert_id: alert.id, state: "acknowledged" }) });
    if (response.ok) setAlerts((current) => current.map((item) => item.id === alert.id ? { ...item, state: "acknowledged" } : item));
  }
  return <section className="workspaceSection teamWorkspace">
    <div className="workspaceSectionHead"><div><span>Team workspace</span><h2>Shared decisions</h2></div><Users/></div>
    <p className="sectionIntro">Teams share review ownership and decision history while public reports remain open and exact-artifact evidence stays unchanged.</p>
    <form className="createRow" onSubmit={create}><input value={name} onChange={(event) => setName(event.target.value)} placeholder="New team name" aria-label="New team name" maxLength={80}/><button className="iconButton" type="submit" title="Create team" aria-label="Create team"><Plus/></button></form>
    {state === "loading" ? <p className="workspaceMessage">Loading team workspaces…</p> : null}
    {state === "ready" && !teams.length ? <p className="workspaceMessage">Create a team to share review ownership and an auditable decision queue.</p> : null}
    {teams.map((team) => <button className={`teamWorkspaceRow ${activeTeamId === team.id ? "active" : ""}`} type="button" onClick={() => setActiveTeamId(team.id)} key={team.id}><div><strong>{team.name}</strong><small>{team.role} · {team.slug}</small></div><span>{team.role}</span></button>)}
    {activeTeamId ? <div className="teamAlertQueue"><strong>Team attention queue</strong>{!alerts.length ? <p>No shared alerts need attention.</p> : alerts.map((alert) => <article key={alert.id}><span>{alert.severity || "INFORMATIONAL"}</span><div><strong>{alert.title}</strong><p>{alert.summary}</p><small>{alert.extension_id}@{alert.version}</small></div>{alert.state === "acknowledged" ? <em>Acknowledged</em> : <button type="button" onClick={() => void acknowledge(alert)}>Acknowledge</button>}</article>)}</div> : null}
    {error ? <p className="previewError">{error}</p> : null}
  </section>;
}
