"use client";

import {
  Bot,
  Check,
  ChevronRight,
  CircleDot,
  FileCode2,
  Files,
  GitBranch,
  KeyRound,
  Network,
  Play,
  Search,
  Settings2,
  Shield,
  ShieldAlert,
  TerminalSquare,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  evaluatePolicy,
  type CapabilityGrant,
  type CapabilityRequest,
} from "@/lib/guardrailsPolicy";
import styles from "./ide.module.css";

const now = "2026-08-06T12:00:00.000Z";
const principal = "agent:guardrails/reviewer@1";
const workspace = "guardrails-ide";

const grants: CapabilityGrant[] = [
  {
    id: "workspace-source-read",
    principalId: principal,
    workspaceId: workspace,
    capability: "filesystem",
    actions: ["read"],
    resourcePattern: "workspace/src/**",
    effect: "allow",
    approval: "automatic",
  },
  {
    id: "block-environment-files",
    principalId: principal,
    workspaceId: workspace,
    capability: "filesystem",
    actions: ["read", "write"],
    resourcePattern: "workspace/**/.env*",
    effect: "deny",
    approval: "automatic",
  },
  {
    id: "review-source-writes",
    principalId: principal,
    workspaceId: workspace,
    capability: "filesystem",
    actions: ["write"],
    resourcePattern: "workspace/src/**",
    effect: "allow",
    approval: "prompt",
  },
  {
    id: "approved-api-egress",
    principalId: principal,
    workspaceId: workspace,
    capability: "network",
    actions: ["connect"],
    resourcePattern: "https://api.openai.com/**",
    effect: "allow",
    approval: "automatic",
  },
];

const scenarios: Array<{ label: string; request: CapabilityRequest; detail: string }> = [
  {
    label: "Read source",
    detail: "Read workspace/src/policy.ts",
    request: {
      id: "req-read-source",
      principalId: principal,
      workspaceId: workspace,
      capability: "filesystem",
      action: "read",
      resource: "workspace/src/policy.ts",
      requestedAt: now,
    },
  },
  {
    label: "Read .env",
    detail: "Read workspace/config/.env.local",
    request: {
      id: "req-read-env",
      principalId: principal,
      workspaceId: workspace,
      capability: "filesystem",
      action: "read",
      resource: "workspace/config/.env.local",
      requestedAt: now,
    },
  },
  {
    label: "Write patch",
    detail: "Write workspace/src/broker.ts",
    request: {
      id: "req-write-source",
      principalId: principal,
      workspaceId: workspace,
      capability: "filesystem",
      action: "write",
      resource: "workspace/src/broker.ts",
      requestedAt: now,
    },
  },
  {
    label: "Unknown egress",
    detail: "Connect https://unknown.example/upload",
    request: {
      id: "req-unknown-egress",
      principalId: principal,
      workspaceId: workspace,
      capability: "network",
      action: "connect",
      resource: "https://unknown.example/upload",
      requestedAt: now,
    },
  },
];

const tree = [
  ["src", "folder"],
  ["  broker.ts", "file"],
  ["  policy.ts", "active"],
  ["  secrets.ts", "file"],
  ["tests", "folder"],
  ["  policy.test.ts", "file"],
  [".env.local", "locked"],
] as const;

export default function GuardRailsWorkbench() {
  const [scenarioIndex, setScenarioIndex] = useState(1);
  const scenario = scenarios[scenarioIndex];
  const decision = useMemo(() => evaluatePolicy(scenario.request, grants), [scenario]);

  return (
    <main className={styles.shell}>
      <section className={styles.intro}>
        <div>
          <span className={styles.eyebrow}><Shield size={14} /> GuardRails IDE / control plane preview</span>
          <h1>Code with agents.<br /><em>Keep authority contained.</em></h1>
        </div>
        <p>Every extension, agent, command, file, secret, and network request crosses an explicit capability boundary. No ambient access. No inherited secrets.</p>
      </section>

      <section className={styles.ideWindow} aria-label="GuardRails IDE security control plane">
        <div className={styles.titleBar}>
          <div className={styles.trafficLights}><i /><i /><i /></div>
          <span>GuardRails-IDE — secure-workspace</span>
          <span className={styles.secure}><Shield size={12} /> Sandbox policy active</span>
        </div>

        <div className={styles.workbench}>
          <aside className={styles.activityBar} aria-label="Activity bar">
            <button className={styles.activityActive} aria-label="Explorer"><Files /></button>
            <button aria-label="Search"><Search /></button>
            <button aria-label="Source control"><GitBranch /></button>
            <button aria-label="Run"><Play /></button>
            <button aria-label="Agent security"><Shield /></button>
            <button className={styles.activitySettings} aria-label="Settings"><Settings2 /></button>
          </aside>

          <aside className={styles.explorer}>
            <div className={styles.panelTitle}><span>Explorer</span><small>•••</small></div>
            <strong className={styles.workspaceTitle}><ChevronRight size={13} /> GUARDRAILS-IDE</strong>
            <div className={styles.fileTree}>
              {tree.map(([name, type]) => (
                <div className={type === "active" ? styles.fileActive : ""} key={name}>
                  {type === "folder" ? <ChevronRight /> : type === "locked" ? <KeyRound /> : <FileCode2 />}
                  <span>{name}</span>{type === "locked" && <small>blocked</small>}
                </div>
              ))}
            </div>
            <div className={styles.agentCard}>
              <span><Bot size={15} /> Active principal</span>
              <strong>GuardRails Reviewer</strong>
              <code>agent:guardrails/reviewer@1</code>
            </div>
          </aside>

          <section className={styles.editor}>
            <div className={styles.tabs}><div><FileCode2 /> policy.ts <span>×</span></div></div>
            <div className={styles.breadcrumbs}>src <ChevronRight /> policy.ts <ChevronRight /> <span>defaultWorkspacePolicy</span></div>
            <pre className={styles.code} aria-label="Policy code example"><code>
              <span><b>1</b><i>export const</i> defaultWorkspacePolicy = {'{'}</span>
              <span><b>2</b>  principal: <q>&quot;agent:guardrails/reviewer@1&quot;</q>,</span>
              <span><b>3</b>  defaults: <q>&quot;deny&quot;</q>,</span>
              <span><b>4</b>  capabilities: {'{'}</span>
              <span><b>5</b>    filesystem: {'{'}</span>
              <span><b>6</b>      read: [<q>&quot;workspace/src/**&quot;</q>],</span>
              <span className={styles.codeDanger}><b>7</b>      deny: [<q>&quot;workspace/**/.env*&quot;</q>],</span>
              <span><b>8</b>      write: <i>reviewRequired</i>(<q>&quot;workspace/src/**&quot;</q>),</span>
              <span><b>9</b>    {'}'},</span>
              <span><b>10</b>   network: allowlist(<q>&quot;api.openai.com&quot;</q>),</span>
              <span><b>11</b>   secrets: <i>opaqueHandlesOnly</i>,</span>
              <span><b>12</b> {'}'}</span>
              <span><b>13</b>{'}'} <i>satisfies</i> WorkspacePolicy;</span>
            </code></pre>
            <div className={styles.terminal}>
              <div className={styles.terminalTabs}><strong>Security events</strong><span>Terminal</span><span>Output</span><small>Policy v12</small></div>
              <div className={styles.eventLine}><CircleDot /><time>12:00:04</time><code>{scenario.request.principalId}</code><span>{scenario.detail}</span></div>
              <div className={`${styles.eventResult} ${styles[decision.outcome]}`}>
                {decision.outcome === "allow" ? <Check /> : <ShieldAlert />}
                <strong>{decision.outcome.toUpperCase()}</strong>
                <span>{decision.reason.replaceAll("_", " ").toLowerCase()}</span>
                <code>{decision.matchingGrantId ?? "default-deny"}</code>
              </div>
            </div>
          </section>

          <aside className={styles.securityPanel}>
            <div className={styles.securityHead}><span><Shield /> Security</span><small>LIVE</small></div>
            <div className={styles.posture}>
              <div className={styles.postureRing}><strong>4</strong><small>grants</small></div>
              <div><strong>Contained</strong><span>Default deny is active</span></div>
            </div>
            <div className={styles.boundaries}>
              <h2>Active boundaries</h2>
              <div><Files /><span><strong>Filesystem</strong><small>1 read · writes reviewed</small></span><i /></div>
              <div><Network /><span><strong>Network</strong><small>1 destination allowed</small></span><i /></div>
              <div><TerminalSquare /><span><strong>Processes</strong><small>No grants</small></span><i className={styles.off} /></div>
              <div><KeyRound /><span><strong>Secrets</strong><small>Opaque handles only</small></span><i /></div>
            </div>
            <div className={styles.scenarios}>
              <h2>Simulate a request</h2>
              {scenarios.map((item, index) => <button className={scenarioIndex === index ? styles.selectedScenario : ""} onClick={() => setScenarioIndex(index)} key={item.label}><span>{item.label}</span><small>{item.request.action}</small></button>)}
            </div>
            <p className={styles.prototypeNote}>Policy-layer prototype. Production enforcement also requires native OS sandboxing and brokered I/O.</p>
          </aside>
        </div>
        <div className={styles.statusBar}><span><Shield size={12} /> GuardRails protected</span><span>0 inherited env vars</span><span>Network: brokered</span><span>Policy v12</span></div>
      </section>

      <section className={styles.promise}>
        <div><small>01 / isolate</small><h2>Separate identity<br />for every principal.</h2><p>Extensions and agents run outside the trusted editor process with their own resource limits and broker-only IPC.</p></div>
        <div><small>02 / broker</small><h2>Credentials used,<br />never revealed.</h2><p>Opaque handles let an approved request use a short-lived credential without placing it in model context or extension memory.</p></div>
        <div><small>03 / verify</small><h2>Every action leaves<br />an explanation.</h2><p>Stable reason codes and append-only events make allows, denials, prompts, delegation, and revocation reviewable.</p></div>
      </section>
    </main>
  );
}
