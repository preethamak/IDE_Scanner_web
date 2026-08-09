"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Bot, Check, Clock3, FileCode2, Files, KeyRound, Network, Plus, RotateCcw, Shield, ShieldAlert, TerminalSquare, Trash2 } from "lucide-react";
import { evaluatePolicy, type Capability, type CapabilityGrant, type CapabilityRequest } from "@/lib/guardrailsPolicy";
import { brokerReceipt, templateGrants, type PolicyTemplateId } from "@/lib/guardrailsControlPlane";
import styles from "./ide.module.css";

const workspaceId = "workspace:guardrails-demo";
const principalOptions = [
  { id: "agent:guardrails/reviewer@1", label: "Review agent", kind: "Agent", icon: Bot },
  { id: "extension:acme/typescript-tools@sha256:42", label: "TypeScript tools", kind: "Extension", icon: FileCode2 },
  { id: "tool:mcp/github-review@sha256:91", label: "GitHub review tool", kind: "Tool", icon: TerminalSquare },
] as const;
const requestTemplates: Array<{ id: string; label: string; capability: Capability; action: string; resource: string; icon: typeof Files }> = [
  { id: "source", label: "Read source file", capability: "filesystem", action: "read", resource: "workspace/src/policy.ts", icon: Files },
  { id: "secret", label: "Read environment file", capability: "filesystem", action: "read", resource: "workspace/config/.env.local", icon: KeyRound },
  { id: "credential", label: "Use GitHub credential", capability: "secret", action: "inject", resource: "secret://github/review-token", icon: KeyRound },
  { id: "network", label: "Connect to package API", capability: "network", action: "connect", resource: "https://registry.npmjs.org/lodash", icon: Network },
  { id: "command", label: "Run test command", capability: "process", action: "execute", resource: "npm:test", icon: TerminalSquare },
];
type Scope = "once" | "session" | "workspace";
type AuditEvent = { id: number; principal: string; request: string; outcome: string; reason: string; time: string; receipt: string };

const policyTemplates: Array<{ id: PolicyTemplateId; name: string; detail: string }> = [
  { id: "locked", name: "Read-only workspace", detail: "Source reads only. Secrets, commands, and egress remain denied." },
  { id: "review", name: "Patch review", detail: "Read source and prompt before a structured test command." },
  { id: "package-audit", name: "Package audit", detail: "Read source and connect only to the npm registry." },
];

const denyEnv: CapabilityGrant = { id: "protected-environment-files", principalId: "*", workspaceId, capability: "filesystem", actions: ["read", "write"], resourcePattern: "workspace/**/.env*", effect: "deny", approval: "automatic" };

export default function GuardRailsWorkbench() {
  const [principalId, setPrincipalId] = useState(principalOptions[0].id as string);
  const [requestId, setRequestId] = useState("source");
  const [scope, setScope] = useState<Scope>("session");
  const [minutes, setMinutes] = useState("30");
  const [grants, setGrants] = useState<CapabilityGrant[]>([]);
  const [audit, setAudit] = useState<AuditEvent[]>([]);
  const [policyVersion, setPolicyVersion] = useState(13);
  const [previousGrantCount, setPreviousGrantCount] = useState(0);
  const selected = requestTemplates.find((item) => item.id === requestId) || requestTemplates[0];
  const principal = principalOptions.find((item) => item.id === principalId) || principalOptions[0];
  const normalizedDeny = { ...denyEnv, principalId };
  const request: CapabilityRequest = useMemo(() => ({ id: `request-${requestId}`, principalId, workspaceId, capability: selected.capability, action: selected.action, resource: selected.resource, requestedAt: new Date().toISOString() }), [principalId, requestId, selected]);
  const decision = evaluatePolicy(request, [normalizedDeny, ...grants]);

  function addGrant() {
    const expiresAt = scope === "workspace" ? undefined : new Date(Date.now() + (scope === "once" ? 2 : Math.max(1, Number(minutes))) * 60_000).toISOString();
    const grant: CapabilityGrant = { id: `${scope}-${selected.id}-${Date.now()}`, principalId, workspaceId, capability: selected.capability, actions: [selected.action], resourcePattern: selected.resource, effect: "allow", approval: selected.capability === "process" ? "prompt" : "automatic", expiresAt };
    setGrants((current) => [...current.filter((item) => !(item.principalId === principalId && item.capability === grant.capability && item.resourcePattern === grant.resourcePattern)), grant]);
    setPreviousGrantCount(grants.length);
    setPolicyVersion((current) => current + 1);
  }
  function applyTemplate(template: PolicyTemplateId) {
    const next = templateGrants(template, principalId, workspaceId, requestTemplates);
    setPreviousGrantCount(grants.length); setGrants(next); setPolicyVersion((current) => current + 1);
  }
  function simulate() {
    const result = evaluatePolicy({ ...request, requestedAt: new Date().toISOString() }, [normalizedDeny, ...grants]);
    setAudit((current) => [{ id: Date.now(), principal: principal.label, request: selected.label, outcome: result.outcome, reason: result.reason.replaceAll("_", " ").toLowerCase(), time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }), receipt: brokerReceipt(selected.id, result.outcome) }, ...current].slice(0, 6));
    if (scope === "once" && result.outcome !== "deny") setGrants((current) => current.filter((item) => item.principalId !== principalId || item.resourcePattern !== selected.resource));
  }

  return <main className={styles.shell}>
    <section className={styles.hero}>
      <div><span className={styles.eyebrow}><Shield/> GuardRails IDE control plane</span><h1>Give every tool<br/><em>only what it needs.</em></h1><p>Select a principal, describe an action in plain language, choose how long authority lasts, and see the policy decision before a native broker exists.</p></div>
      <aside><ShieldAlert/><strong>Browser prototype—not an OS sandbox</strong><p>This page demonstrates the permission contract. It does not isolate local processes, files, credentials, or network traffic.</p></aside>
    </section>

    <section className={styles.controlPlane} aria-label="Interactive IDE permission control plane">
      <header><div><span>Permission center</span><strong>{workspaceId}</strong></div><div className={styles.policyState}><i/> Default deny · policy v{policyVersion}</div></header>
      <div className={styles.builder}>
        <section className={styles.editorPanel}>
          <div className={styles.step}><span>01</span><div><h2>Who is asking?</h2><p>Authority follows the exact agent, extension, or delegated tool identity.</p></div></div>
          <div className={styles.principals}>{principalOptions.map((option) => <button key={option.id} className={principalId === option.id ? styles.selected : ""} onClick={() => setPrincipalId(option.id)}><option.icon/><span><strong>{option.label}</strong><small>{option.kind}</small></span>{principalId === option.id ? <Check/> : null}</button>)}</div>

          <div className={styles.step}><span>02</span><div><h2>What may it do?</h2><p>Choose a normalized request. Sensitive environment files remain explicitly denied.</p></div></div>
          <div className={styles.requests}>{requestTemplates.map((item) => <button key={item.id} className={requestId === item.id ? styles.selected : ""} onClick={() => setRequestId(item.id)}><item.icon/><span><strong>{item.label}</strong><small>{item.resource}</small></span></button>)}</div>

          <div className={styles.step}><span>03</span><div><h2>How long should access last?</h2><p>Once-only grants are consumed after use. Session grants expire automatically.</p></div></div>
          <div className={styles.scopeRow}>{(["once", "session", "workspace"] as Scope[]).map((item) => <button key={item} className={scope === item ? styles.scopeActive : ""} onClick={() => setScope(item)}>{item === "once" ? "Once" : item === "session" ? "This session" : "Workspace"}</button>)}{scope === "session" ? <label><Clock3/> Expires in <input aria-label="Session grant duration in minutes" type="number" min="1" max="480" value={minutes} onChange={(event) => setMinutes(event.target.value)}/> min</label> : null}</div>
          <button className={styles.addGrant} onClick={addGrant}><Plus/> Add scoped grant</button>
        </section>

        <aside className={styles.decisionPanel}>
          <span className={styles.panelLabel}>Decision preview</span>
          <div className={`${styles.decision} ${styles[decision.outcome]}`}><div>{decision.outcome === "allow" ? <Check/> : <ShieldAlert/>}<strong>{decision.outcome}</strong></div><p>{decision.reason.replaceAll("_", " ").toLowerCase()}</p><code>{decision.matchingGrantId || "default-deny"}</code></div>
          <dl><div><dt>Principal</dt><dd>{principal.label}</dd></div><div><dt>Capability</dt><dd>{selected.capability} · {selected.action}</dd></div><div><dt>Resource</dt><dd>{selected.resource}</dd></div><div><dt>Delegation</dt><dd>User → {principal.kind} → broker request</dd></div></dl>
          <button className={styles.simulate} onClick={simulate}>Simulate request <ArrowRight/></button>
          <div className={styles.activeGrants}><header><strong>Active grants</strong><span>{grants.length}</span></header>{grants.length ? grants.map((grant) => <article key={grant.id}><div><strong>{grant.capability} · {grant.actions[0]}</strong><small>{grant.resourcePattern}</small><time>{grant.expiresAt ? `Expires ${new Date(grant.expiresAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Workspace grant"}</time></div><button aria-label={`Revoke ${grant.capability} grant`} onClick={() => setGrants((current) => current.filter((item) => item.id !== grant.id))}><Trash2/></button></article>) : <p>No ambient authority. Add a grant to change the decision.</p>}</div>
        </aside>
      </div>
      <section className={styles.brokerLab}><header><span>Broker demonstrations</span><h2>Inspect the handoff—not a fake execution.</h2><p>Each receipt shows what a future native broker must bind and enforce outside the untrusted process.</p></header><div>{[
        [Files,"Filesystem broker","Canonical workspace path","No host path or symlink escape"],
        [Network,"Network broker","Exact destination + redirect recheck","Loopback and metadata addresses denied"],
        [TerminalSquare,"Command broker","Executable + normalized arguments","No inherited environment or shell expansion"],
        [KeyRound,"Credential broker","Opaque handle + destination binding","Secret value never enters tool output"],
      ].map(([Icon,title,binding,boundary]) => { const BrokerIcon=Icon as typeof Files; return <article key={String(title)}><BrokerIcon/><strong>{String(title)}</strong><span>{String(binding)}</span><small>{String(boundary)}</small></article>; })}</div></section>
      <section className={styles.policyStudio}><header><div><span>Policy templates</span><h2>Start constrained, then compare the change.</h2></div><div><strong>v{policyVersion - 1} → v{policyVersion}</strong><small>{grants.length - previousGrantCount >= 0 ? "+" : ""}{grants.length - previousGrantCount} grants</small></div></header><div>{policyTemplates.map((template) => <button key={template.id} onClick={() => applyTemplate(template.id)}><Shield/><span><strong>{template.name}</strong><small>{template.detail}</small></span><ArrowRight/></button>)}</div></section>
      <section className={styles.audit}><header><div><span>Audit timeline</span><h2>Every simulation leaves a reason and broker receipt.</h2></div><button disabled={!audit.length} onClick={() => setAudit([])}><RotateCcw/> Clear timeline</button></header>{audit.length ? <div>{audit.map((event) => <article key={event.id}><time>{event.time}</time><span className={styles[event.outcome]}>{event.outcome}</span><div><strong>{event.request}</strong><small>{event.principal} · {event.reason}</small><code>{event.receipt}</code></div></article>)}</div> : <p>Simulate a request to record its principal, outcome, stable policy reason, and secret-safe broker receipt.</p>}</section>
    </section>

    <section className={styles.roadmap}><article><small>Shipped in this preview</small><h2>Human-readable grants</h2><p>Principal selection, once/session/workspace scope, expiration, revocation, delegation context, and an audit timeline.</p></article><article><small>Next native milestone</small><h2>Enforcement outside the process</h2><p>A native supervisor, filesystem broker, structured-command runner, egress proxy, and opaque credential handles.</p></article><article><small>Release boundary</small><h2>Conformance before compatibility</h2><p>No broad extension compatibility claim until the Linux isolation suite proves that undeclared access fails closed.</p></article></section>
  </main>;
}
