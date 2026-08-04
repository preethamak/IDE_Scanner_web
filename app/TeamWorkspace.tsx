"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, RefreshCw, Trash2, Users } from "lucide-react";
import { browserDb } from "@/lib/supabase";
import { trackProductEvent } from "@/lib/analyticsEvents";
import { groupDecisionQueue, type QueueDecision } from "@/lib/teamDecisionQueue";
import ReleaseEventQueue from "@/app/ReleaseEventQueue";

type Team = { id: string; name: string; slug: string; role: string };
type Delivery = { status: string; attempts: number; delivered_at: string | null; last_error: string | null; next_attempt_at: string | null };
type Alert = { id: string; title: string; summary: string; severity: string | null; state: string; extension_id: string; version: string; team_notification_deliveries?: Delivery[] };
type Channel = { id: string; kind: "slack_webhook" | "generic_webhook" | "jira_cloud" | "email_resend"; label: string; minimum_severity: string; last_validated_at: string | null };
type Invitation = { id: string; role: string; expires_at: string; accepted_at: string | null; created_at: string };
type Member = { user_id: string; role: string; profiles?: { display_name?: string | null } | Array<{ display_name?: string | null }> | null };
type WatchItem = { extension_id: string; created_at: string; baseline_version?: string | null; baseline_artifact_sha256?: string | null; monitoring_state?: string; extensions?: { display_name?: string; icon_url?: string } | Array<{ display_name?: string; icon_url?: string }> | null };
type MonitoringPreferences = { release_alerts: boolean; scan_alerts: boolean; decision_alerts: boolean; high_evidence_alerts: boolean; provenance_alerts: boolean; coverage_alerts: boolean; due_alerts: boolean };
const defaultMonitoringPreferences: MonitoringPreferences = { release_alerts: true, scan_alerts: true, decision_alerts: true, high_evidence_alerts: true, provenance_alerts: true, coverage_alerts: true, due_alerts: true };

export default function TeamWorkspace({ initialExtension = "", focus = "workspace" }: { initialExtension?: string; focus?: "workspace" | "monitor" }) {
  const db = useMemo(() => browserDb(), []);
  const [teams, setTeams] = useState<Team[]>([]);
  const [name, setName] = useState("");
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [activeTeamId, setActiveTeamId] = useState("");
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [dismissalReasons, setDismissalReasons] = useState<Record<string, string>>({});
  const [alertState, setAlertState] = useState<"idle" | "saving" | "error">("idle");
  const [decisions, setDecisions] = useState<QueueDecision[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [monitoringPreferences, setMonitoringPreferences] = useState<MonitoringPreferences>(defaultMonitoringPreferences);
  const [preferencesState, setPreferencesState] = useState<"idle" | "saving" | "error">("idle");
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [membersError, setMembersError] = useState("");
  const [invitationsError, setInvitationsError] = useState("");
  const [watchItems, setWatchItems] = useState<WatchItem[]>([]);
  const [webhook, setWebhook] = useState("");
  const [channelKind, setChannelKind] = useState<Channel["kind"]>("slack_webhook");
  const [jiraSite, setJiraSite] = useState(""); const [jiraEmail, setJiraEmail] = useState(""); const [jiraToken, setJiraToken] = useState(""); const [jiraProject, setJiraProject] = useState("");
  const [notificationEmail, setNotificationEmail] = useState("");
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
    setState("loading"); setError("");
    try {
      const accessToken = await token();
      if (!accessToken) throw new Error("Your sign-in session has expired. Sign in again to open your workspace.");
      const response = await fetch("/api/teams", { headers: { Authorization: `Bearer ${accessToken}` } });
      const body = await response.json().catch(() => ({})) as { teams?: unknown; error?: unknown };
      if (!response.ok) throw new Error(typeof body.error === "string" ? body.error : "Your workspace could not be loaded.");
      const available = Array.isArray(body.teams) ? body.teams as Team[] : [];
      setTeams(available); setActiveTeamId((current) => current || available[0]?.id || ""); setState("ready");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Your workspace could not be loaded."); setState("error");
    }
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
      const response = await fetch(`/api/teams/${encodeURIComponent(activeTeamId)}/monitoring-preferences`, { headers: { Authorization: `Bearer ${accessToken}` } });
      const body = await response.json();
      if (response.ok) setMonitoringPreferences({ ...defaultMonitoringPreferences, ...body });
    })();
  }, [activeTeamId, token]);
  useEffect(() => {
    if (!activeTeamId) return;
    void (async () => {
      const accessToken = await token();
      const response = await fetch(`/api/teams/${encodeURIComponent(activeTeamId)}/members`, { headers: { Authorization: `Bearer ${accessToken}` } });
      const body = await response.json().catch(() => ({}));
      if (response.ok && Array.isArray(body.members)) { setMembers(body.members); setMembersError(""); }
      else { setMembers([]); setMembersError(typeof body.error === "string" ? body.error : "Team members could not be loaded. Please try again."); }
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
      const body = await response.json().catch(() => ({}));
      if (response.ok) { setInvitations(Array.isArray(body.invitations) ? body.invitations : []); setInvitationsError(""); }
      else { setInvitations([]); setInvitationsError(typeof body.error === "string" ? body.error : "Invitations could not be loaded. Please try again."); }
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
  async function dismiss(alert: Alert) {
    const dismissalReason = (dismissalReasons[alert.id] || "").trim();
    if (!dismissalReason) { setAlertState("error"); return; }
    setAlertState("saving"); const accessToken = await token();
    const response = await fetch(`/api/teams/${encodeURIComponent(activeTeamId)}/alerts`, { method: "PATCH", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ alert_id: alert.id, state: "dismissed", dismissal_reason: dismissalReason }) });
    if (response.ok) { setAlerts((current) => current.filter((item) => item.id !== alert.id)); setDismissalReasons((current) => { const next = { ...current }; delete next[alert.id]; return next; }); setAlertState("idle"); }
    else setAlertState("error");
  }
  async function updateMonitoringPreference(field: keyof MonitoringPreferences, value: boolean) {
    setPreferencesState("saving"); const accessToken = await token();
    const response = await fetch(`/api/teams/${encodeURIComponent(activeTeamId)}/monitoring-preferences`, { method: "PATCH", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ [field]: value }) });
    const body = await response.json();
    if (response.ok) { setMonitoringPreferences({ ...defaultMonitoringPreferences, ...body }); setPreferencesState("idle"); }
    else setPreferencesState("error");
  }
  async function saveDecision(decision: QueueDecision, patch: { decision?: string; assigned_to?: string | null; due_at?: string | null }) {
    const accessToken = await token();
    const response = await fetch(`/api/teams/${encodeURIComponent(activeTeamId)}/decisions`, { method: "POST", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ scan_id: decision.scan_id, decision: patch.decision || decision.decision, rationale: decision.rationale || "", assigned_to: patch.assigned_to === undefined ? decision.assigned_to || null : patch.assigned_to, due_at: patch.due_at === undefined ? decision.due_at || null : patch.due_at }) });
    const body = await response.json();
    if (response.ok) setDecisions((current) => current.map((item) => item.id === decision.id ? { ...item, ...body } : item));
  }
  async function connectChannel(event: FormEvent) {
    event.preventDefault(); if (!activeTeamId || !webhook.trim()) return;
    setChannelState("saving"); const accessToken = await token();
    const response = await fetch(`/api/teams/${encodeURIComponent(activeTeamId)}/notification-channels`, { method: "POST", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ kind: channelKind, label: channelLabel, webhook_url: webhook, jira_site: jiraSite, jira_email: jiraEmail, jira_api_token: jiraToken, jira_project_key: jiraProject, email: notificationEmail, minimum_severity: "MEDIUM" }) });
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
  async function removeWatchItem(extensionId: string) {
    const accessToken = await token();
    const response = await fetch(`/api/teams/${encodeURIComponent(activeTeamId)}/watchlist?extension_id=${encodeURIComponent(extensionId)}`, { method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` } });
    if (response.ok) setWatchItems((current) => current.filter((item) => item.extension_id !== extensionId));
  }
  if (state === "error") return <section className="workspaceSection teamWorkspace workspaceLoadError" aria-live="polite"><div className="workspaceSectionHead"><div><span>Workspace</span><h2>We couldn’t load your workspace.</h2></div><Users/></div><p className="sectionIntro">{error}</p><div className="workspaceRecoveryActions"><button className="button buttonDark" type="button" onClick={() => void load()}><RefreshCw/> Try again</button><Link className="button buttonQuiet" href="/account?next=/workspace">Sign in again</Link></div></section>;
  const activeTeam = teams.find((team) => team.id === activeTeamId);
  const decisionQueue = groupDecisionQueue(decisions);
  return <section className="workspaceSection teamWorkspace">
    <div className="workspaceSectionHead"><div><span>{focus === "monitor" ? "Team monitoring" : "Team workspace"}</span><h2>{focus === "monitor" ? "Shared release watches" : "Shared decisions"}</h2></div><Users/></div>
    <p className="sectionIntro">Teams share review ownership and decision history while public reports remain open and exact-artifact evidence stays unchanged.</p>
    {activeTeamId ? <ReleaseEventQueue teamId={activeTeamId}/> : null}
    <form className="createRow" onSubmit={create}><input value={name} onChange={(event) => setName(event.target.value)} placeholder="New team name" aria-label="New team name" maxLength={80}/><button className="iconButton" type="submit" title="Create team" aria-label="Create team"><Plus/></button></form>
    {state === "loading" ? <p className="workspaceMessage">Loading team workspaces…</p> : null}
    {state === "ready" && !teams.length ? <p className="workspaceMessage">Create a team to share review ownership and an auditable decision queue.</p> : null}
    {teams.map((team) => <button className={`teamWorkspaceRow ${activeTeamId === team.id ? "active" : ""}`} type="button" onClick={() => setActiveTeamId(team.id)} key={team.id}><div><strong>{team.name}</strong><small>{team.role} · {team.slug}</small></div><span>{team.role}</span></button>)}
    {activeTeamId ? <div className="teamChannels"><strong>Members</strong><p>{membersError || members.map((member) => `${memberName(member)} (${member.role})`).join(" · ") || "No members found."}</p></div> : null}
    {activeTeam && ["owner", "admin", "analyst"].includes(activeTeam.role) ? <div className="teamChannels"><strong>Team release watch</strong><p>Start a watch from a completed extension report. This prevents a team from monitoring an unreviewed or incomplete artifact as though it were approved.</p><Link className="button buttonQuiet" href={initialExtension ? `/extensions/${encodeURIComponent(initialExtension)}` : "/registry"}>{initialExtension ? "Open this extension’s report" : "Find a completed report"}</Link>{watchItems.map((item) => <p key={item.extension_id}>{watchItemName(item)} <code>{item.extension_id}@{item.baseline_version || "baseline pending"}</code> <span className={`releaseState ${item.monitoring_state || "baseline_pending"}`}>{(item.monitoring_state || "baseline_pending").replaceAll("_", " ")}</span> <button type="button" className="textAction" onClick={() => void removeWatchItem(item.extension_id)} aria-label={`Stop monitoring ${item.extension_id}`}><Trash2/> Stop</button></p>)}{!watchItems.length ? <p>No team extensions are being monitored yet.</p> : null}</div> : null}
    {activeTeam && ["owner", "admin"].includes(activeTeam.role) ? <div className="teamChannels"><strong>Team notification events</strong><p>These controls determine which queued team alerts can reach connected channels.</p><div className="monitoringPreferences">{([['release_alerts', 'New releases'], ['scan_alerts', 'Completed scans'], ['decision_alerts', 'Decision changes'], ['high_evidence_alerts', 'High-severity evidence'], ['provenance_alerts', 'Provenance changes'], ['coverage_alerts', 'Coverage regressions'], ['due_alerts', 'Decision due dates']] as Array<[keyof MonitoringPreferences, string]>).map(([field, label]) => <label key={field}><input type="checkbox" checked={monitoringPreferences[field]} disabled={preferencesState === "saving"} onChange={(event) => void updateMonitoringPreference(field, event.target.checked)}/><span>{label}</span></label>)}</div>{preferencesState === "error" ? <p className="previewError">Could not save notification preferences.</p> : null}</div> : null}
    {activeTeamId ? <div className="teamAlertQueue"><strong>Team attention queue</strong>{!alerts.length ? <p>No shared alerts need attention.</p> : alerts.map((alert) => <article key={alert.id}><span>{alert.severity || "INFORMATIONAL"}</span><div><strong>{alert.title}</strong><p>{alert.summary}</p><small>{alert.extension_id}@{alert.version}{alert.team_notification_deliveries?.length ? ` · ${alert.team_notification_deliveries.map((delivery) => delivery.status === "failed" ? `delivery failed after ${delivery.attempts} attempts; retry ${delivery.next_attempt_at ? new Date(delivery.next_attempt_at).toLocaleString() : "scheduled"}` : `delivery ${delivery.status}`).join(" · ")}` : " · no delivery channel"}</small></div><div className="teamAlertActions">{alert.state === "acknowledged" ? <em>Acknowledged</em> : <button type="button" onClick={() => void acknowledge(alert)}>Acknowledge</button>}<label><span className="srOnly">Dismissal reason for {alert.title}</span><input value={dismissalReasons[alert.id] || ""} onChange={(event) => setDismissalReasons((current) => ({ ...current, [alert.id]: event.target.value }))} maxLength={400} placeholder="Dismissal reason"/></label><button type="button" onClick={() => void dismiss(alert)} disabled={alertState === "saving"}>Dismiss</button></div></article>)}{alertState === "error" ? <p className="previewError">Add a dismissal reason before closing an alert.</p> : null}</div> : null}
    {activeTeamId ? <div className="teamAlertQueue"><strong>Decision queue</strong><DecisionGroup title="Due soon" decisions={decisionQueue.dueSoon} members={members} editable={Boolean(activeTeam && ["owner", "admin", "analyst"].includes(activeTeam.role))} onSave={saveDecision}/><DecisionGroup title="Open" decisions={decisionQueue.open} members={members} editable={Boolean(activeTeam && ["owner", "admin", "analyst"].includes(activeTeam.role))} onSave={saveDecision}/><DecisionGroup title="Resolved" decisions={decisionQueue.resolved} members={members} editable={Boolean(activeTeam && ["owner", "admin", "analyst"].includes(activeTeam.role))} onSave={saveDecision}/></div> : null}
    {activeTeam && ["owner", "admin"].includes(activeTeam.role) ? <div className="teamChannels"><strong>Invite a teammate</strong><form className="channelForm" onSubmit={createInvite}><select aria-label="Invite role" value={inviteRole} onChange={(event) => setInviteRole(event.target.value)}><option value="admin">Administrator</option><option value="analyst">Analyst</option><option value="viewer">Viewer</option></select><span>Expires in 7 days</span><button className="button buttonQuiet" type="submit" disabled={inviteState === "saving"}>{inviteState === "saving" ? "Creating" : "Create invite"}</button></form>{invitationsError ? <p className="previewError">{invitationsError}</p> : null}{inviteUrl ? <p className="workspaceMessage">Share once: <a href={inviteUrl}>{inviteUrl}</a></p> : null}{invitations.filter((invitation) => !invitation.accepted_at).map((invitation) => <p key={invitation.id} className="workspaceMessage">Pending {invitation.role} invite · expires {new Date(invitation.expires_at).toLocaleDateString()} <button type="button" className="textAction" onClick={() => void revokeInvite(invitation.id)}>Revoke</button></p>)}{inviteState === "error" ? <p className="previewError">Could not create the invitation.</p> : null}</div> : null}
    {activeTeam && ["owner", "admin"].includes(activeTeam.role) ? <div className="teamChannels"><strong>Team notification delivery</strong>{channels.map((channel) => <p key={channel.id}>{channel.label} · {channel.kind === "slack_webhook" ? "Slack" : channel.kind === "jira_cloud" ? "Jira Cloud" : channel.kind === "email_resend" ? "Email" : "Generic webhook"} · {channel.minimum_severity} and above{channel.last_validated_at ? " · connected" : ""} <button type="button" className="textAction" onClick={() => void removeChannel(channel.id)}>Disconnect</button></p>)}<form className="channelForm" onSubmit={connectChannel}><select aria-label="Notification channel type" value={channelKind} onChange={(event) => setChannelKind(event.target.value as Channel["kind"])}><option value="slack_webhook">Slack</option><option value="generic_webhook">Generic webhook</option><option value="jira_cloud">Jira Cloud</option><option value="email_resend">Email</option></select>{channelKind === "jira_cloud" ? <><input value={jiraSite} onChange={(event) => setJiraSite(event.target.value)} placeholder="https://your-team.atlassian.net" aria-label="Jira Cloud site"/><input type="email" value={jiraEmail} onChange={(event) => setJiraEmail(event.target.value)} placeholder="Atlassian email" aria-label="Jira account email"/><input type="password" value={jiraToken} onChange={(event) => setJiraToken(event.target.value)} placeholder="Jira API token" aria-label="Jira API token" autoComplete="off"/><input value={jiraProject} onChange={(event) => setJiraProject(event.target.value)} placeholder="Project key" aria-label="Jira project key" maxLength={20}/></> : channelKind === "email_resend" ? <input type="email" value={notificationEmail} onChange={(event) => setNotificationEmail(event.target.value)} placeholder="Security mailbox" aria-label="Notification email address"/> : <input type="password" value={webhook} onChange={(event) => setWebhook(event.target.value)} placeholder={channelKind === "slack_webhook" ? "Slack incoming webhook" : "HTTPS webhook endpoint"} aria-label={channelKind === "slack_webhook" ? "Team Slack incoming webhook" : "Team generic webhook endpoint"} autoComplete="off"/>}<input value={channelLabel} onChange={(event) => setChannelLabel(event.target.value)} placeholder="Channel name" aria-label="Team channel name" maxLength={80}/><button className="button buttonQuiet" type="submit" disabled={channelState === "saving"}>{channelState === "saving" ? "Connecting" : "Connect channel"}</button></form>{channelState === "error" ? <p className="previewError">Could not validate and connect that notification channel.</p> : null}</div> : null}
    {error ? <p className="previewError">{error}</p> : null}
  </section>;
}

function DecisionGroup({ title, decisions, members, editable, onSave }: { title: string; decisions: QueueDecision[]; members: Member[]; editable: boolean; onSave: (decision: QueueDecision, patch: { decision?: string; assigned_to?: string | null; due_at?: string | null }) => Promise<void> }) {
  return <div className="teamDecisionGroup"><small>{title}</small>{!decisions.length ? <p>None.</p> : decisions.map((decision) => <DecisionCard key={decision.id} decision={decision} members={members} editable={editable} onSave={onSave}/>)}</div>;
}
function DecisionCard({ decision, members, editable, onSave }: { decision: QueueDecision; members: Member[]; editable: boolean; onSave: (decision: QueueDecision, patch: { decision?: string; assigned_to?: string | null; due_at?: string | null }) => Promise<void> }) {
  const [assignee, setAssignee] = useState(decision.assigned_to || "");
  const [dueAt, setDueAt] = useState(decision.due_at ? decision.due_at.slice(0, 10) : "");
  return <article><span>{decision.decision}</span><div><strong>{decision.extension_id}@{decision.version}</strong><p>{decision.due_at ? `Due ${new Date(decision.due_at).toLocaleString()}` : "No review due date"}</p>{editable ? <div className="decisionControls"><select aria-label={`Assignee for ${decision.extension_id}`} value={assignee} onChange={(event) => { setAssignee(event.target.value); void onSave(decision, { assigned_to: event.target.value || null }); }}><option value="">Unassigned</option>{members.map((member) => <option key={member.user_id} value={member.user_id}>{memberName(member)}</option>)}</select><input aria-label={`Due date for ${decision.extension_id}`} type="date" value={dueAt} onChange={(event) => { setDueAt(event.target.value); void onSave(decision, { due_at: event.target.value || null }); }}/><select aria-label={`Decision for ${decision.extension_id}`} value={decision.decision} onChange={(event) => void onSave(decision, { decision: event.target.value })}><option value="review">Review</option><option value="allow">Allow</option><option value="block">Block</option><option value="exception">Exception</option></select></div> : null}</div></article>;
}
function memberName(member: Member) { const profile = Array.isArray(member.profiles) ? member.profiles[0] : member.profiles; return profile?.display_name || "Team member"; }
function watchItemName(item: WatchItem) { const extension = Array.isArray(item.extensions) ? item.extensions[0] : item.extensions; return extension?.display_name || item.extension_id; }
