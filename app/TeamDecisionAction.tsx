"use client";

import Link from "next/link";
import styles from "./dossier/teamDecisionAction.module.css";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckSquare } from "lucide-react";
import { trackProductEvent } from "@/lib/analyticsEvents";
import { browserDb } from "@/lib/supabase";
import { browserAuthHeaders } from "@/lib/browserAuth";

type Team = { id: string; name: string; role: string };
type Member = { user_id: string; role: string; profiles?: { display_name?: string | null } | Array<{ display_name?: string | null }> | null };

export default function TeamDecisionAction({ scanId, extensionId, version }: { scanId: string; extensionId: string; version: string }) {
  const db = useMemo(() => browserDb(), []);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamId, setTeamId] = useState("");
  const [decision, setDecision] = useState("review");
  const [state, setState] = useState<"hidden" | "ready" | "saving" | "saved" | "error">("hidden");
  const [rationale, setRationale] = useState("");
  const [message, setMessage] = useState("");
  const [savedId, setSavedId] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [assignee, setAssignee] = useState("");
  const [dueAt, setDueAt] = useState("");

  const token = useCallback(async () => browserAuthHeaders(db), [db]);
  useEffect(() => {
    void (async () => {
      try {
        const headers = await token();
        if (!headers.Authorization) return;
        const response = await fetch("/api/teams", { headers });
        const body = await response.json();
        const available = Array.isArray(body.teams) ? body.teams.filter((team: Team) => ["owner", "admin", "analyst"].includes(team.role)) : [];
        if (response.ok && available.length) { setTeams(available); setTeamId(available[0].id); setState("ready"); }
      } catch { setState("hidden"); }
    })();
  }, [token]);
  useEffect(() => {
    if (!teamId) return;
    let cancelled = false;
    void (async () => {
      try {
        const headers = await token();
        const response = await fetch(`/api/teams/${encodeURIComponent(teamId)}/members`, { headers });
        const body = await response.json();
        if (!cancelled) setMembers(response.ok && Array.isArray(body.members) ? body.members : []);
      } catch { if (!cancelled) setMembers([]); }
    })();
    return () => { cancelled = true; };
  }, [teamId, token]);
  async function save() {
    if (!teamId) return;
    if (decision !== "review" && !rationale.trim()) { setMessage("Add a reason before recording an approval, block, or exception."); setState("error"); return; }
    setState("saving"); setMessage("");
    try {
      const headers = await token();
      const response = await fetch(`/api/teams/${encodeURIComponent(teamId)}/decisions`, { method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ scan_id: scanId, decision, rationale: rationale.trim(), assigned_to: assignee || null, due_at: dueAt ? new Date(dueAt).toISOString() : null }) });
      const body = await response.json().catch(() => ({}));
      if (response.ok) {
        setSavedId(String(body.id || ""));
        trackProductEvent({ name: "decision_created", source_route: window.location.pathname, decision: decision as "allow" | "review" | "block" | "exception" });
        setState("saved");
      } else { setMessage(String(body.error || "Could not save the team decision.")); setState("error"); }
    } catch { setMessage("The connection failed. Your reason is still here; try saving again."); setState("error"); }
  }
  if (state === "hidden") return null;
  const workspaceHref = `/workspace?view=inbox&intent=review&extension=${encodeURIComponent(extensionId)}&version=${encodeURIComponent(version)}&scanId=${encodeURIComponent(scanId)}${savedId ? `&review=${encodeURIComponent(savedId)}` : ""}`;
  return <details className={styles.action}>
    <summary>Record a team decision</summary>
    {state === "saved" ? <div className={styles.receipt} role="status"><strong>Team decision saved</strong><p>{extensionId}@{version} · {decision === "review" ? "Review open" : decision}. Your reason is attached to this exact scan.</p><Link href={workspaceHref}>Open workspace review →</Link></div> : <form className={styles.form} onSubmit={(event) => { event.preventDefault(); void save(); }}>
      <p>Record your team’s assessment of {extensionId}@{version}. Monitoring and approval are separate actions.</p>
      <div className={styles.fields}>
        <label>Workspace<select aria-label="Team" value={teamId} onChange={(event) => { setTeamId(event.target.value); setAssignee(""); setMembers([]); }} disabled={state === "saving"}>{teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label>
        <label>Decision<select aria-label="Decision" value={decision} onChange={(event) => setDecision(event.target.value)} disabled={state === "saving"}><option value="review">Keep in review</option><option value="allow">Allow</option><option value="block">Block</option><option value="exception">Exception</option></select></label>
        <label>Owner<select aria-label="Decision owner" value={assignee} onChange={(event) => setAssignee(event.target.value)} disabled={state === "saving"}><option value="">Unassigned</option>{members.map((member) => <option key={member.user_id} value={member.user_id}>{memberName(member)} · {member.role}</option>)}</select></label>
        <label>Due date<input aria-label="Review due date" type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} disabled={state === "saving"} /></label>
      </div>
      <label>Reason<textarea aria-label="Decision rationale" value={rationale} onChange={(event) => setRationale(event.target.value)} placeholder="Explain which evidence supports this decision." maxLength={4000} required={decision !== "review"} disabled={state === "saving"} /></label>
      <button className="button buttonDark" type="submit" disabled={state === "saving"}><CheckSquare size={15}/>{state === "saving" ? "Saving…" : "Save team decision"}</button>
      {state === "error" ? <p className={styles.error} role="alert">{message}</p> : null}
    </form>}
  </details>;
}

function memberName(member: Member) {
  const profile = Array.isArray(member.profiles) ? member.profiles[0] : member.profiles;
  return profile?.display_name || member.user_id;
}
