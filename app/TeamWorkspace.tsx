"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Activity, ArrowRight, Bell, Blocks, CheckCircle2, ChevronDown, CircleAlert, Command, Inbox, LayoutDashboard, LogOut, Menu, Plus, Radar, RefreshCw, Search, Settings, ShieldCheck, Sparkles, UserRound, X } from "lucide-react";
import BrandMark from "@/app/BrandMark";
import { browserDb } from "@/lib/supabase";
import { groupDecisionQueue, type QueueDecision } from "@/lib/teamDecisionQueue";
import styles from "@/app/workspace/teamWorkspace.module.css";

type Team = { id: string; name: string; slug: string; role: string };
type Delivery = { status: string; attempts: number; delivered_at: string | null; last_error: string | null; next_attempt_at: string | null };
type Alert = { id: string; title: string; summary: string; severity: string | null; state: string; extension_id: string; version: string; team_notification_deliveries?: Delivery[] };
type Member = { user_id: string; role: string; profiles?: { display_name?: string | null } | Array<{ display_name?: string | null }> | null };
type WatchItem = { extension_id: string; created_at: string; baseline_version?: string | null; monitoring_state?: string; extensions?: { display_name?: string } | Array<{ display_name?: string }> | null };
type View = "overview" | "inbox" | "extensions" | "decisions" | "activity" | "settings";

const nav = [
  ["overview", "Overview", LayoutDashboard], ["inbox", "Review inbox", Inbox], ["extensions", "Extensions", Blocks], ["decisions", "Decisions", ShieldCheck], ["activity", "Activity", Activity],
] as const;

export default function TeamWorkspace(props: { initialExtension?: string; focus?: "workspace" | "monitor" } = {}) {
  const db = useMemo(() => browserDb(), []);
  const registryHref = props.initialExtension ? `/extensions/${encodeURIComponent(props.initialExtension)}` : "/registry";
  const [teams, setTeams] = useState<Team[]>([]);
  const [activeTeamId, setActiveTeamId] = useState("");
  const [view, setView] = useState<View>("overview");
  const [state, setState] = useState<"loading"|"ready"|"error">("loading");
  const [error, setError] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [mobileNav, setMobileNav] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [decisions, setDecisions] = useState<QueueDecision[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [watchItems, setWatchItems] = useState<WatchItem[]>([]);
  const [dataState, setDataState] = useState<"idle"|"loading"|"ready"|"error">("idle");
  const [saveState, setSaveState] = useState<"idle"|"saving"|"saved"|"error">("idle");

  const token = useCallback(async () => (await db?.auth.getSession())?.data.session?.access_token || "", [db]);
  const loadTeams = useCallback(async () => {
    setState("loading"); setError("");
    try {
      const accessToken = await token();
      if (!accessToken) throw new Error("Your session expired. Sign in again to continue.");
      const [{ data: user }, response] = await Promise.all([db!.auth.getUser(), fetch("/api/teams", { headers: { Authorization: `Bearer ${accessToken}` } })]);
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(String(body.error || "Your workspaces could not be loaded."));
      const available = Array.isArray(body.teams) ? body.teams as Team[] : [];
      setUserEmail(user.user?.email || "Signed-in user"); setTeams(available); setActiveTeamId((current) => current || available[0]?.id || ""); setState("ready");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Workspace unavailable."); setState("error"); }
  }, [db, token]);

  useEffect(() => { const timer = window.setTimeout(() => void loadTeams(), 0); return () => window.clearTimeout(timer); }, [loadTeams]);
  const loadWorkspace = useCallback(async () => {
    if (!activeTeamId) return;
    setDataState("loading"); setAlerts([]); setDecisions([]); setMembers([]); setWatchItems([]);
    try {
      const accessToken = await token(); const headers = { Authorization: `Bearer ${accessToken}` };
      const base = `/api/teams/${encodeURIComponent(activeTeamId)}`;
      const responses = await Promise.all([fetch(`${base}/alerts`, { headers }), fetch(`${base}/decisions`, { headers }), fetch(`${base}/members`, { headers }), fetch(`${base}/watchlist`, { headers })]);
      const bodies = await Promise.all(responses.map((response) => response.json().catch(() => ({}))));
      if (responses.some((response) => !response.ok)) throw new Error("Some workspace data could not be refreshed.");
      setAlerts(Array.isArray(bodies[0].alerts) ? bodies[0].alerts : []); setDecisions(Array.isArray(bodies[1].decisions) ? bodies[1].decisions : []); setMembers(Array.isArray(bodies[2].members) ? bodies[2].members : []); setWatchItems(Array.isArray(bodies[3].items) ? bodies[3].items : []); setDataState("ready");
    } catch { setDataState("error"); }
  }, [activeTeamId, token]);
  useEffect(() => { const timer = window.setTimeout(() => void loadWorkspace(), 0); return () => window.clearTimeout(timer); }, [loadWorkspace]);

  async function createTeam(name: string) {
    const accessToken = await token(); const response = await fetch("/api/teams", { method:"POST", headers:{ Authorization:`Bearer ${accessToken}`, "Content-Type":"application/json" }, body:JSON.stringify({ name }) });
    const body = await response.json().catch(() => ({})); if (!response.ok) throw new Error(String(body.error || "Workspace creation failed.")); setTeams((current) => [body, ...current]); setActiveTeamId(body.id);
  }
  async function saveDecision(decision: QueueDecision, nextDecision: string) {
    setSaveState("saving"); const accessToken = await token();
    const response = await fetch(`/api/teams/${encodeURIComponent(activeTeamId)}/decisions`, { method:"POST", headers:{ Authorization:`Bearer ${accessToken}`, "Content-Type":"application/json" }, body:JSON.stringify({ scan_id:decision.scan_id, decision:nextDecision, rationale:decision.rationale || "", assigned_to:decision.assigned_to || null, due_at:decision.due_at || null }) });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) { setSaveState("error"); return; }
    setDecisions((current) => current.map((item) => item.id === decision.id ? { ...item, ...body } : item)); setSaveState("saved"); window.setTimeout(() => setSaveState("idle"), 2200);
  }
  async function signOut() { await db?.auth.signOut(); window.location.assign("/"); }

  if (state === "loading") return <WorkspaceLoading/>;
  if (state === "error") return <main className={styles.recovery}><CircleAlert/><h1>We couldn’t open your workspace.</h1><p>{error}</p><button onClick={() => void loadTeams()}><RefreshCw/> Try again</button><Link href="/account?next=/workspace">Sign in again</Link></main>;
  if (!teams.length) return <WorkspaceOnboarding email={userEmail} onCreate={createTeam} onSignOut={signOut}/>;

  const activeTeam = teams.find((team) => team.id === activeTeamId) || teams[0];
  const openDecisions = decisions.filter((item) => item.decision === "review");
  const canDecide = ["owner", "admin", "analyst"].includes(activeTeam.role);
  const overdue = openDecisions.filter((item) => item.due_at && new Date(item.due_at) < new Date()).length;
  const failedDeliveries = alerts.filter((alert) => alert.team_notification_deliveries?.some((delivery) => delivery.status === "failed")).length;

  return <div className={styles.app}>
    <aside className={`${styles.sidebar} ${mobileNav ? styles.sidebarOpen : ""}`}>
      <div className={styles.brand}><BrandMark/><strong>GuardRails</strong><button aria-label="Close navigation" onClick={() => setMobileNav(false)}><X/></button></div>
      <WorkspaceSwitcher teams={teams} active={activeTeam} onChange={setActiveTeamId}/>
      <nav aria-label="Workspace navigation">{nav.map(([id,label,Icon]) => <button key={id} className={view===id?styles.navActive:""} onClick={() => {setView(id);setMobileNav(false)}}><Icon/><span>{label}</span>{id === "inbox" && openDecisions.length ? <em>{openDecisions.length}</em>:null}</button>)}</nav>
      <div className={styles.sidebarBottom}><button className={view==="settings"?styles.navActive:""} onClick={() => {setView("settings");setMobileNav(false)}}><Settings/><span>Settings</span></button><button><Command/><span>Command menu</span><kbd>⌘ K</kbd></button><div className={styles.account}><span>{initials(userEmail)}</span><div><strong>{userEmail.split("@")[0]}</strong><small>{activeTeam.role} · {userEmail}</small></div><button onClick={() => void signOut()} title="Sign out" aria-label="Sign out"><LogOut/></button></div></div>
    </aside>
    {mobileNav ? <button className={styles.scrim} aria-label="Close navigation" onClick={() => setMobileNav(false)}/>:null}
    <main className={styles.main}>
      <header className={styles.topbar}><button className={styles.menuButton} onClick={() => setMobileNav(true)} aria-label="Open navigation"><Menu/></button><div className={styles.search}><Search/><span>Search extensions, decisions, or people…</span><kbd>⌘ K</kbd></div><div className={styles.topActions}><button aria-label="Notifications"><Bell/>{alerts.length ? <i/>:null}</button><Link href={registryHref}><Plus/> Add extension</Link></div></header>
      <div className={styles.content}>
        {dataState === "error" ? <div className={styles.dataError}><CircleAlert/><span>Some workspace data could not be refreshed.</span><button onClick={() => void loadWorkspace()}>Try again</button></div>:null}
        {view === "overview" ? <Overview team={activeTeam} decisions={openDecisions} alerts={alerts} watches={watchItems} overdue={overdue} failed={failedDeliveries} loading={dataState==="loading"} onNavigate={setView}/>:null}
        {view === "inbox" ? <ReviewInbox decisions={openDecisions} members={members} canDecide={canDecide} saveState={saveState} onSave={saveDecision}/>:null}
        {view === "extensions" ? <ExtensionsView watches={watchItems}/>:null}
        {view === "decisions" ? <DecisionsView decisions={decisions}/>:null}
        {view === "activity" ? <ActivityView alerts={alerts} decisions={decisions}/>:null}
        {view === "settings" ? <SettingsView team={activeTeam} members={members}/>:null}
      </div>
    </main>
  </div>;
}

function WorkspaceSwitcher({teams,active,onChange}:{teams:Team[];active:Team;onChange:(id:string)=>void}) { return <label className={styles.switcher}><span>{initials(active.name)}</span><div><strong>{active.name}</strong><small>{roleName(active.role)}</small></div><select aria-label="Switch workspace" value={active.id} onChange={(event)=>onChange(event.target.value)}>{teams.map(team=><option key={team.id} value={team.id}>{team.name}</option>)}</select><ChevronDown/></label> }
function WorkspaceLoading(){return <main className={styles.loading}><div className={styles.loadingBrand}><BrandMark/><strong>GuardRails</strong></div><div><span/><span/><span/></div><p>Preparing your security workspace…</p></main>}
function WorkspaceOnboarding({email,onCreate,onSignOut}:{email:string;onCreate:(name:string)=>Promise<void>;onSignOut:()=>Promise<void>}) { const [name,setName]=useState("");const [saving,setSaving]=useState(false);const [error,setError]=useState("");async function submit(e:FormEvent){e.preventDefault();if(!name.trim())return;setSaving(true);setError("");try{await onCreate(name.trim())}catch(cause){setError(cause instanceof Error?cause.message:"Could not create workspace.");setSaving(false)}}return <main className={styles.onboarding}><header><div><BrandMark/><strong>GuardRails</strong></div><button onClick={()=>void onSignOut()}><LogOut/> Sign out</button></header><section><span className={styles.step}>Step 1 of 3</span><div className={styles.onboardingIcon}><Sparkles/></div><h1>Build your security workspace.</h1><p>Start with a name. Next, GuardRails will help you monitor your first extension and invite your team.</p><form onSubmit={submit}><label>Workspace name<input autoFocus value={name} onChange={e=>setName(e.target.value)} placeholder="Acme Engineering" maxLength={80}/></label><button disabled={saving||!name.trim()}>{saving?"Creating workspace…":"Continue"}<ArrowRight/></button>{error?<small>{error}</small>:null}</form><div className={styles.onboardingPromise}><span><CheckCircle2/> Exact release baselines</span><span><CheckCircle2/> Meaningful change alerts</span><span><CheckCircle2/> Auditable team decisions</span></div><small>Signed in as {email}</small></section></main>}

function PageTitle({eyebrow,title,copy,action}:{eyebrow:string;title:string;copy:string;action?:React.ReactNode}){return <header className={styles.pageTitle}><div><span>{eyebrow}</span><h1>{title}</h1><p>{copy}</p></div>{action}</header>}
function Overview({team,decisions,alerts,watches,overdue,failed,loading,onNavigate}:{team:Team;decisions:QueueDecision[];alerts:Alert[];watches:WatchItem[];overdue:number;failed:number;loading:boolean;onNavigate:(view:View)=>void}){return <><PageTitle eyebrow="Workspace overview" title={`Good ${greeting()}, ${team.name}.`} copy={decisions.length?`${decisions.length} release ${decisions.length===1?"decision needs":"decisions need"} your team’s attention.`:"Everything important is in view. Your review queue is clear."} action={<button className={styles.refresh} onClick={()=>window.location.reload()}><RefreshCw/> Refresh</button>}/><section className={styles.metrics}><Metric label="Needs review" value={decisions.length} detail="Meaningful release changes" tone="amber" onClick={()=>onNavigate("inbox")}/><Metric label="Overdue" value={overdue} detail={overdue?"Ownership needs attention":"No late decisions"} tone={overdue?"red":"green"}/><Metric label="Monitoring" value={watches.length} detail="Extension baselines" tone="green" onClick={()=>onNavigate("extensions")}/><Metric label="Workspace health" value={failed?`${failed} issue${failed===1?"":"s"}`:"Healthy"} detail={failed?"Delivery needs attention":"Monitoring is operational"} tone={failed?"red":"green"}/></section><div className={styles.overviewGrid}><section className={styles.attention}><header><div><span>Priority queue</span><h2>Needs attention</h2></div><button onClick={()=>onNavigate("inbox")}>View inbox <ArrowRight/></button></header>{loading?<QueueSkeleton/>:decisions.length?decisions.slice(0,4).map((decision,index)=><ReviewRow key={decision.id} decision={decision} priority={index===0}/>):<EmptyReview/>}</section><aside className={styles.health}><span>Monitoring health</span><div className={styles.healthRing}><b>{watches.length?Math.max(90,100-failed*5):0}%</b><small>current</small></div><ul><li><i className={styles.green}/><span>Active baselines</span><strong>{watches.length}</strong></li><li><i className={styles.blue}/><span>New alerts</span><strong>{alerts.length}</strong></li><li><i className={failed?styles.red:styles.green}/><span>Delivery failures</span><strong>{failed}</strong></li></ul><button onClick={()=>onNavigate("extensions")}>Open monitoring <ArrowRight/></button></aside></div><section className={styles.activityCard}><header><div><span>Live workspace</span><h2>Recent activity</h2></div><button onClick={()=>onNavigate("activity")}>See all</button></header><div>{alerts.slice(0,3).map(alert=><article key={alert.id}><span><Radar/></span><p><strong>{alert.title}</strong><small>{alert.extension_id}@{alert.version} · Monitoring event</small></p><time>Recent</time></article>)}{!alerts.length?<article><span><CheckCircle2/></span><p><strong>Your workspace is caught up.</strong><small>New releases and team decisions will appear here.</small></p><time>Now</time></article>:null}</div></section></>}
function Metric({label,value,detail,tone,onClick}:{label:string;value:string|number;detail:string;tone:string;onClick?:()=>void}){return <button className={`${styles.metric} ${styles[tone]}`} onClick={onClick} disabled={!onClick}><span>{label}<i/></span><strong>{value}</strong><small>{detail}</small></button>}
function ReviewRow({decision,priority}:{decision:QueueDecision;priority?:boolean}){return <article className={styles.reviewRow}><span className={priority?styles.riskHigh:styles.riskMedium}>{priority?"High":"Review"}</span><div className={styles.extensionAvatar}>{initials(decision.extension_id)}</div><div><strong>{decision.extension_id}</strong><small>Exact release <code>@{decision.version}</code></small></div><p>{priority?"New capabilities require a team decision":"Release evidence is ready for review"}</p><span className={styles.owner}><UserRound/> {decision.assigned_to?"Assigned":"Unassigned"}</span><ArrowRight/></article>}
function EmptyReview(){return <div className={styles.empty}><span><CheckCircle2/></span><h3>Your team is caught up.</h3><p>When a monitored release changes something meaningful, it will appear here with its evidence.</p><Link href="/registry">Monitor an extension <ArrowRight/></Link></div>}
function QueueSkeleton(){return <div className={styles.skeleton}><span/><span/><span/></div>}

function ReviewInbox({decisions,members,canDecide,saveState,onSave}:{decisions:QueueDecision[];members:Member[];canDecide:boolean;saveState:string;onSave:(d:QueueDecision,v:string)=>Promise<void>}){return <><PageTitle eyebrow="Review inbox" title="Make the next call." copy="Prioritized extension releases, connected to their exact evidence and owner." action={<Link className={styles.primaryAction} href="/registry"><Plus/> Add extension</Link>}/><div className={styles.filterBar}><button className={styles.filterActive}>Open <span>{decisions.length}</span></button><button>Assigned to me</button><button>Unassigned</button><button>Overdue</button></div><section className={styles.inboxList}>{decisions.length?decisions.map((decision,index)=><article key={decision.id} className={styles.inboxCard}><div className={styles.inboxIdentity}><div className={styles.extensionAvatar}>{initials(decision.extension_id)}</div><div><span>{index===0?"High priority":"Ready for review"}</span><h2>{decision.extension_id}</h2><code>Release @{decision.version}</code></div></div><div className={styles.changeSummary}><span>Why it matters</span><strong>{index===0?"New behavior was detected in this release.":"The new artifact is ready for comparison."}</strong><p>Open the exact analysis to review files, commands, connections, and capability changes.</p></div><div className={styles.inboxMeta}><span><UserRound/> {decision.assigned_to?memberLabel(members,decision.assigned_to):"Unassigned"}</span><span><Radar/> Evidence ready</span></div><div className={styles.inboxActions}><Link href={`/extensions/${encodeURIComponent(decision.extension_id)}/versions/${encodeURIComponent(decision.version)}`}>Review evidence <ArrowRight/></Link>{canDecide?<div><button onClick={()=>void onSave(decision,"allow")} disabled={saveState==="saving"}>Allow</button><button onClick={()=>void onSave(decision,"block")} disabled={saveState==="saving"}>Block</button></div>:<small>View-only access</small>}</div></article>):<EmptyReview/>}</section>{saveState!=="idle"?<div className={`${styles.toast} ${saveState=== "error"?styles.toastError:""}`}>{saveState==="saving"?"Recording decision…":saveState==="saved"?"Decision recorded and added to the audit trail.":"Decision could not be saved. Try again."}</div>:null}</>}
function ExtensionsView({watches}:{watches:WatchItem[]}){return <><PageTitle eyebrow="Monitoring" title="Extensions under watch." copy="Every baseline stays tied to the exact release your team reviewed." action={<Link className={styles.primaryAction} href="/registry"><Plus/> Monitor extension</Link>}/><section className={styles.tableCard}><header><span>Extension</span><span>Baseline</span><span>Monitoring state</span><span>Last checked</span></header>{watches.map(item=><article key={item.extension_id}><div><span className={styles.extensionAvatar}>{initials(item.extension_id)}</span><strong>{watchName(item)}</strong><small>{item.extension_id}</small></div><code>@{item.baseline_version||"Pending"}</code><span className={styles.statusGood}><i/>{humanize(item.monitoring_state||"baseline pending")}</span><time>Recently</time></article>)}{!watches.length?<div className={styles.tableEmpty}><Radar/><h2>Start your monitoring coverage.</h2><p>Add an extension from a completed report. GuardRails will preserve its baseline and watch every new release.</p><Link href="/registry">Find an extension <ArrowRight/></Link></div>:null}</section></>}
function DecisionsView({decisions}:{decisions:QueueDecision[]}){const groups=groupDecisionQueue(decisions);return <><PageTitle eyebrow="Decision history" title="Every call, accountable." copy="Ownership, rationale, and exact artifact identity stay attached to each decision."/><section className={styles.decisionGrid}>{[["Due soon",groups.dueSoon],["Open",groups.open],["Resolved",groups.resolved]].map(([label,items])=><div key={label as string}><header><span>{label as string}</span><em>{(items as QueueDecision[]).length}</em></header>{(items as QueueDecision[]).map(item=><article key={item.id}><span className={styles.extensionAvatar}>{initials(item.extension_id)}</span><div><strong>{item.extension_id}</strong><code>@{item.version}</code></div><em>{humanize(item.decision)}</em></article>)}{!(items as QueueDecision[]).length?<p>No decisions here.</p>:null}</div>)}</section></>}
function ActivityView({alerts,decisions}:{alerts:Alert[];decisions:QueueDecision[]}){return <><PageTitle eyebrow="Audit-ready activity" title="A living security record." copy="Release events and decisions stay visible to everyone with workspace access."/><section className={styles.timeline}>{alerts.map(alert=><article key={alert.id}><span><Bell/></span><div><strong>{alert.title}</strong><p>{alert.summary}</p><small>{alert.extension_id}@{alert.version}</small></div><time>Monitoring</time></article>)}{decisions.slice(0,10).map(item=><article key={item.id}><span><ShieldCheck/></span><div><strong>{humanize(item.decision)} decision recorded</strong><p>{item.extension_id} release @{item.version}</p></div><time>Decision</time></article>)}{!alerts.length&&!decisions.length?<EmptyReview/>:null}</section></>}
function SettingsView({team,members}:{team:Team;members:Member[]}){return <><PageTitle eyebrow="Workspace settings" title={`Manage ${team.name}.`} copy="Membership, delivery, and security controls for this workspace."/><div className={styles.settingsLayout}><nav><button className={styles.settingsActive}>General</button><button>Members & roles</button><button>Notifications</button><button>Integrations</button><button>Audit log</button></nav><section><div className={styles.settingBlock}><span>Workspace</span><h2>General information</h2><label>Workspace name<input value={team.name} readOnly/></label><label>Your role<input value={roleName(team.role)} readOnly/></label></div><div className={styles.settingBlock}><span>People</span><h2>{members.length} workspace member{members.length===1?"":"s"}</h2><div className={styles.memberList}>{members.map(member=><article key={member.user_id}><span>{initials(memberName(member))}</span><strong>{memberName(member)}</strong><em>{roleName(member.role)}</em></article>)}{!members.length?<p>Member directory is empty.</p>:null}</div></div></section></div></>}

function initials(value:string){return value.split(/[\s.@_-]+/).filter(Boolean).slice(0,2).map(part=>part[0]?.toUpperCase()).join("")||"GR"}function greeting(){const hour=new Date().getHours();return hour<12?"morning":hour<18?"afternoon":"evening"}function humanize(value:string){return value.replaceAll("_"," ").replace(/^./,letter=>letter.toUpperCase())}function roleName(role:string){return role==="owner"?"Workspace owner":role==="admin"?"Administrator":role==="analyst"?"Security analyst":"Viewer"}function memberName(member:Member){const profile=Array.isArray(member.profiles)?member.profiles[0]:member.profiles;return profile?.display_name||"Team member"}function memberLabel(members:Member[],id:string){return memberName(members.find(member=>member.user_id===id)||{user_id:id,role:"viewer"})}function watchName(item:WatchItem){const data=Array.isArray(item.extensions)?item.extensions[0]:item.extensions;return data?.display_name||item.extension_id}
