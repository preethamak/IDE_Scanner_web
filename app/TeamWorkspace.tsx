"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Plus, Users } from "lucide-react";
import { browserDb } from "@/lib/supabase";

type Team = { id: string; name: string; slug: string; role: string };

export default function TeamWorkspace() {
  const db = useMemo(() => browserDb(), []);
  const [teams, setTeams] = useState<Team[]>([]);
  const [name, setName] = useState("");
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");

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
    setTeams(Array.isArray(body.teams) ? body.teams : []); setState("ready");
  }
  useEffect(() => { void load(); }, []);
  async function create(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim(); if (!trimmed) return;
    setError(""); const accessToken = await token();
    const response = await fetch("/api/teams", { method: "POST", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ name: trimmed }) });
    const body = await response.json();
    if (!response.ok) { setError(String(body.error || "Team creation failed.")); return; }
    setName(""); setTeams((current) => [body, ...current]);
  }
  return <section className="workspaceSection teamWorkspace">
    <div className="workspaceSectionHead"><div><span>Team workspace</span><h2>Shared decisions</h2></div><Users/></div>
    <p className="sectionIntro">Teams share review ownership and decision history while public reports remain open and exact-artifact evidence stays unchanged.</p>
    <form className="createRow" onSubmit={create}><input value={name} onChange={(event) => setName(event.target.value)} placeholder="New team name" aria-label="New team name" maxLength={80}/><button className="iconButton" type="submit" title="Create team" aria-label="Create team"><Plus/></button></form>
    {state === "loading" ? <p className="workspaceMessage">Loading team workspaces…</p> : null}
    {state === "ready" && !teams.length ? <p className="workspaceMessage">Create a team to share review ownership and an auditable decision queue.</p> : null}
    {teams.map((team) => <article className="teamWorkspaceRow" key={team.id}><div><strong>{team.name}</strong><small>{team.role} · {team.slug}</small></div><span>{team.role}</span></article>)}
    {error ? <p className="previewError">{error}</p> : null}
  </section>;
}
