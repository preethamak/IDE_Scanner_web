"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Users } from "lucide-react";
import { browserDb } from "@/lib/supabase";
import { trackProductEvent } from "@/lib/analyticsEvents";
import { groupDecisionQueue, type QueueDecision } from "@/lib/teamDecisionQueue";

type Team = { id: string; name: string; slug: string; role: string };
type Alert = { id: string; title: string; summary: string; severity: string | null; state: string; extension_id: string; version: string };
type Channel = { id: string; label: string; minimum_severity: string; last_validated_at: string | null };
type Invitation = { id: string; role: string; expires_at: string; accepted_at: string | null; created_at: string };
type Member = { user_id: string; role: string; profiles?: { display_name?: string | null } | Array<{ display_name?: string | null }> | null };
type WatchItem = { extension_id: string; created_at: string; extensions?: { display_name?: string; icon_url?: string } | Array<{ display_name?: string; icon_url?: string }> | null };

export default function TeamWorkspace({ initialExtension = "", focus = "workspace" }: { initialExtension?: string; focus?: "workspace" | "monitor" }) {
  const db = useMemo(() => browserDb(), []);
  const [teams, setTeams] = useState<Team[]>([]);
  const [name, setName] = useState("");
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [activeTeamId, setActiveTeamId] = useState("");
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [decisions, setDecisions] = useState<QueueDecision[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [watchItems, setWatchItems] = useState<WatchItem[]>([]);
  const [watchExtension, setWatchExtension] = useState(initialExtension);
  const [watchState, setWatchState] = useState<"idle" | "saving" | "error">("idle");
  const [webhook, setWebhook] = useState("");
  const [channelLabel, setChannelLabel] = useState("Security alerts");
  const [channelState, setChannelState] = useState<"idle" | "saving" | "error">("idle");
  const [inviteRole, setInviteRole] = useState("analyst");
  const [inviteState, setInviteState] = useState<"idle" | "saving" | "error">("idle");
  const [inviteUrl, setInviteUrl] = useState("");

  const token = useCallback(async () => {
    const session = await db?.auth.getSession();
    return session?.data.session?.access_token || "";
  }, [db]);
  const load = useCallback(async () => {
    const accessToken = await token();
    if (!accessToken) return;
    const response = await fetch("/api/teams", { headers: { Authorization: `Bearer ${accessToken}` } });
    const body = await response.json();
    if (!response.ok) { setError(String(body.error || "Team workspace is unavailable.")); setState("error"); return; }
    const available = Array.isArray(body.teams) ? body.teams : [];
    setTeams(available); setActiveTeamId((current) => current || available[0]?.id || ""); setState("ready");
  }, [token]);
  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, [load]);
  async function create(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim(); if (!trimmed) return;
    setError(""); const accessToken = await token();
    const response = await fetch("/api/teams", { method: "POST", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ name: trimmed }) });
    const body = await response.json();
    if (!response.ok) { setError(String(body.error || "Team creation failed.")); return; }
    setName(""); setTeams((current) => [body, ...current]); setActiveTeamId(body.id);
    trackProductEvent({ name: "workspace_created", source_route: window.location.pathname });
  }
  useEffect(() => {
    if (!activeTeamId) return;
    void (async () => {
      const accessToken = await token();
      const response = await fetch(`/api/teams/${encodeURIComponent(activeTeamId)}/alerts`, { headers: { Authorization: `Bearer ${accessToken}` } });
      const body = await response.json();
      if (response.ok) setAlerts(Array.isArray(body.alerts) ? body.alerts : []);
    })();
  }, [activeTeamId, token]);
  useEffect(() => {
    if (!activeTeamId) return;
    void (async () => {
      const accessToken = await token();
      const response = await fetch(`/api/teams/${encodeURIComponent(activeTeamId)}/members`, { headers: { Authorization: `Bearer ${accessToken}` } });
      const body = await response.json();
      setMembers(response.ok && Array.isArray(body.members) ? body.members : []);
    })();
  }, [activeTeamId, token]);
  useEffect(() => {
    if (!activeTeamId) return;
    void (async () => {
      const accessToken = await token();
      const response = await fetch(`/api/teams/${encodeURIComponent(activeTeamId)}/watchlist`, { headers: { Authorization: `Bearer ${accessToken}` } });
      const body = await response.json();
      setWatchItems(response.ok && Array.isArray(body.items) ? body.items : []);
    })();
  }, [activeTeamId, token]);
  useEffect(() => {
    if (!activeTeamId) return;
    void (async () => {
      const accessToken = await token();
      const response = await fetch(`/api/teams/${encodeURIComponent(activeTeamId)}/invites`, { headers: { Authorization: `Bearer ${accessToken}` } });
      const body = await response.json();
      if (response.ok) setInvitations(Array.isArray(body.invitations) ? body.invitations : []);
      else setInvitations([]);
    })();
  }, [activeTeamId, token]);
  useEffect(() => {
    if (!activeTeamId) return;
    void (async () => {
      const accessToken = await token();
      const response = await fetch(`/api/teams/${encodeURIComponent(activeTeamId)}/decisions`, { headers: { Authorization: `Bearer ${accessToken}` } });
      const body = await response.json();
      if (response.ok) setDecisions(Array.isArray(body.decisions) ? body.decisions : []);
    })();
  }, [activeTeamId, token]);
  useEffect(() => {
    if (!activeTeamId) return;
    void (async () => {
      const accessToken = await token();
      const response = await fetch(`/api/teams/${encodeURIComponent(activeTeamId)}/notification-channels`, { headers: { Authorization: `Bearer ${accessToken}` } });
      const body = await response.json();
      if (response.ok) setChannels(Array.isArray(body.channels) ? body.channels : []);
    })();
  }, [activeTeamId, token]);
  async function acknowledge(alert: Alert) {
    const accessToken = await token();
    const response = await fetch(`/api/teams/${encodeURIComponent(activeTeamId)}/alerts`, { method: "PATCH", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ alert_id: alert.id, state: "acknowledged" }) });
    if (response.ok) setAlerts((current) => current.map((item) => item.id === alert.id ? { ...item, state: "acknowledged" } : item));
  }
  async function connectChannel(event: FormEvent) {
    event.preventDefault(); if (!activeTeamId || !webhook.trim()) return;
    setChannelState("saving"); const accessToken = await token();
    const response = await fetch(`/api/teams/${encodeURIComponent(activeTeamId)}/notification-channels`, { method: "POST", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ label: channelLabel, webhook_url: webhook, minimum_severity: "MEDIUM" }) });
    const body = await response.json();
    if (!response.ok) { setChannelState("error"); return; }
    setWebhook(""); setChannels((current) => [...current, body]); setChannelState("idle");
  }
  async function createInvite(event: FormEvent) {
    event.preventDefault(); if (!activeTeamId) return;
    setInviteState("saving"); setInviteUrl(""); const accessToken = await token();
    const response = await fetch(`/api/teams/${encodeURIComponent(activeTeamId)}/invites`, { method: "POST", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ role: inviteRole, expires_in_days: 7 }) });
    const body = await response.json();
    if (!response.ok) { setInviteState("error"); return; }
    setInviteUrl(`${window.location.origin}${body.invitation_path}`); setInvitations((current) => [body.invitation, ...current]); setInviteState("idle");
  }
  async function revokeInvite(invitationId: string) {
    const accessToken = await token();
    const response = await fetch(`/api/teams/${encodeURIComponent(activeTeamId)}/invites?invitation_id=${encodeURIComponent(invitationId)}`, { method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` } });
    if (response.ok) setInvitations((current) => current.filter((invitation) => invitation.id !== invitationId));
  }
  async function removeChannel(channelId: string) {
    const accessToken = await token();
    const response = await fetch(`/api/teams/${encodeURIComponent(activeTeamId)}/notification-channels?channel_id=${encodeURIComponent(channelId)}`, { method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` } });
    if (response.ok) setChannels((current) => current.filter((channel) => channel.id !== channelId));
  }
  async function addWatchItem(event: FormEvent) {
    event.preventDefault(); if (!activeTeamId || !watchExtension.trim()) return;
    setWatchState("saving"); const accessToken = await token();
    const response = await fetch(`/api/teams/${encodeURIComponent(activeTeamId)}/watchlist`, { method: "POST", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ extension_id: watchExtension.trim() }) });
    const body = await response.json();
    if (!response.ok) { setWatchState("error"); return; }
    setWatchItems((current) => current.some((item) => item.extension_id.toLowerCase() === body.extension_id.toLowerCase()) ? current : [{ ...body, extensions: { display_name: body.extension_id } }, ...current]); setWatchExtension(""); setWatchState("idle");
  }
  async function removeWatchItem(extensionId: string) {
    const accessToken = await token();
    const response = await fetch(`/api/teams/${encodeURIComponent(activeTeamId)}/watchlist?extension_id=${encodeURIComponent(extensionId)}`, { method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` } });
    if (response.ok) setWatchItems((current) => current.filter((item) => item.extension_id !== extensionId));
  }
  const activeTeam = teams.find((team) => team.id === activeTeamId);
  const decisionQueue = groupDecisionQueue(decisions);
  return <section className="workspaceSection teamWorkspace">
    <div className="workspaceSectionHead"><div><span>{focus === "monitor" ? "Team monitoring" : "Team workspace"}</span><h2>{focus === "monitor" ? "Shared release watches" : "Shared decisions"}</h2></div><Users/></div>
    <p className="sectionIntro">Teams share review ownership and decision history while public reports remain open and exact-artifact evidence stays unchanged.</p>
    <form className="createRow" onSubmit={create}><input value={name} onChange={(event) => setName(event.target.value)} placeholder="New team name" aria-label="New team name" maxLength={80}/><button className="iconButton" type="submit" title="Create team" aria-label="Create team"><Plus/></button></form>
    {state === "loading" ? <p className="workspaceMessage">Loading team workspaces…</p> : null}
    {state === "ready" && !teams.length ? <p className="workspaceMessage">Create a team to share review ownership and an auditable decision queue.</p> : null}
    {teams.map((team) => <button className={`teamWorkspaceRow ${activeTeamId === team.id ? "active" : ""}`} type="button" onClick={() => setActiveTeamId(team.id)} key={team.id}><div><strong>{team.name}</strong><small>{team.role} · {team.slug}</small></div><span>{team.role}</span></button>)}
    {activeTeamId ? <div className="teamChannels"><strong>Members</strong><p>{members.map((member) => `${memberName(member)} (${member.role})`).join(" · ") || "No members found."}</p></div> : null}
    {activeTeam && ["owner", "admin", "analyst"].includes(activeTeam.role) ? <div className="teamChannels"><strong>Team release watch</strong><p>Watch an exact registry extension once for the whole team. New releases and completed evidence enter the shared queue.</p><form className="channelForm" onSubmit={addWatchItem}><input value={watchExtension} onChange={(event) => setWatchExtension(event.target.value)} placeholder="publisher.extension" aria-label="Extension identifier to monitor" pattern="[A-Za-z0-9_-]+\.[A-Za-z0-9_.-]+"/><button className="button buttonQuiet" type="submit" disabled={watchState === "saving"}>{watchState === "saving" ? "Adding" : "Monitor extension"}</button></form>{watchItems.map((item) => <p key={item.extension_id}>{watchItemName(item)} <code>{item.extension_id}</code> <button type="button" className="textAction" onClick={() => void removeWatchItem(item.extension_id)} aria-label={`Stop monitoring ${item.extension_id}`}><Trash2/> Stop</button></p>)}{!watchItems.length ? <p>No team extensions are being monitored yet.</p> : null}{watchState === "error" ? <p className="previewError">Could not add that extension. It must already be in the GuardRails catalog.</p> : null}</div> : null}
    {activeTeamId ? <div className="teamAlertQueue"><strong>Team attention queue</strong>{!alerts.length ? <p>No shared alerts need attention.</p> : alerts.map((alert) => <article key={alert.id}><span>{alert.severity || "INFORMATIONAL"}</span><div><strong>{alert.title}</strong><p>{alert.summary}</p><small>{alert.extension_id}@{alert.version}</small></div>{alert.state === "acknowledged" ? <em>Acknowledged</em> : <button type="button" onClick={() => void acknowledge(alert)}>Acknowledge</button>}</article>)}</div> : null}
    {activeTeamId ? <div className="teamAlertQueue"><strong>Decision queue</strong><DecisionGroup title="Due soon" decisions={decisionQueue.dueSoon}/><DecisionGroup title="Open" decisions={decisionQueue.open}/><DecisionGroup title="Resolved" decisions={decisionQueue.resolved}/></div> : null}
    {activeTeam && ["owner", "admin"].includes(activeTeam.role) ? <div className="teamChannels"><strong>Invite a teammate</strong><form className="channelForm" onSubmit={createInvite}><select aria-label="Invite role" value={inviteRole} onChange={(event) => setInviteRole(event.target.value)}><option value="admin">Administrator</option><option value="analyst">Analyst</option><option value="viewer">Viewer</option></select><span>Expires in 7 days</span><button className="button buttonQuiet" type="submit" disabled={inviteState === "saving"}>{inviteState === "saving" ? "Creating" : "Create invite"}</button></form>{inviteUrl ? <p className="workspaceMessage">Share once: <a href={inviteUrl}>{inviteUrl}</a></p> : null}{invitations.filter((invitation) => !invitation.accepted_at).map((invitation) => <p key={invitation.id} className="workspaceMessage">Pending {invitation.role} invite · expires {new Date(invitation.expires_at).toLocaleDateString()} <button type="button" className="textAction" onClick={() => void revokeInvite(invitation.id)}>Revoke</button></p>)}{inviteState === "error" ? <p className="previewError">Could not create the invitation.</p> : null}</div> : null}
    {activeTeam && ["owner", "admin"].includes(activeTeam.role) ? <div className="teamChannels"><strong>Team Slack delivery</strong>{channels.map((channel) => <p key={channel.id}>{channel.label} · {channel.minimum_severity} and above{channel.last_validated_at ? " · connected" : ""} <button type="button" className="textAction" onClick={() => void removeChannel(channel.id)}>Disconnect</button></p>)}<form className="channelForm" onSubmit={connectChannel}><input type="password" value={webhook} onChange={(event) => setWebhook(event.target.value)} placeholder="Slack incoming webhook" aria-label="Team Slack incoming webhook" autoComplete="off"/><input value={channelLabel} onChange={(event) => setChannelLabel(event.target.value)} placeholder="Channel name" aria-label="Team channel name" maxLength={80}/><button className="button buttonQuiet" type="submit" disabled={channelState === "saving"}>{channelState === "saving" ? "Connecting" : "Connect Slack"}</button></form>{channelState === "error" ? <p className="previewError">Could not connect the Slack channel.</p> : null}</div> : null}
    {error ? <p className="previewError">{error}</p> : null}
  </section>;
}

function DecisionGroup({ title, decisions }: { title: string; decisions: QueueDecision[] }) {
  return <div className="teamDecisionGroup"><small>{title}</small>{!decisions.length ? <p>None.</p> : decisions.map((decision) => <article key={decision.id}><span>{decision.decision}</span><div><strong>{decision.extension_id}@{decision.version}</strong><p>{decision.due_at ? `Due ${new Date(decision.due_at).toLocaleString()}` : "No review due date"}</p></div></article>)}</div>;
}
function memberName(member: Member) { const profile = Array.isArray(member.profiles) ? member.profiles[0] : member.profiles; return profile?.display_name || "Team member"; }
function watchItemName(item: WatchItem) { const extension = Array.isArray(item.extensions) ? item.extensions[0] : item.extensions; return extension?.display_name || item.extension_id; }
