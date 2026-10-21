"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Box, CheckCircle2, CircleHelp, Download, FileJson, GitBranch, LoaderCircle, RefreshCw, ShieldCheck } from "lucide-react";
import styles from "./capabilityGraph.module.css";

type Subject = { id: string; kind: string; name: string; version: string | null; publisher: string | null; artifactSha256: string | null; evidenceState: "verified" | "observed" | "unknown"; capabilities: string[]; source: string };
type GraphPayload = { graph: { generatedAt: string; subjects: Subject[]; relationships: Array<{ from: string; to: string; type: string }> }; summary: { subjects: number; by_kind: Record<string, number>; verified: number; unknown_capabilities: number } };

const example = JSON.stringify({
  generatedAt: new Date().toISOString(),
  subjects: [
    { id: "mcp_server:github", kind: "mcp_server", name: "GitHub MCP", version: "1", publisher: "GitHub", artifactSha256: null, evidenceState: "observed", observedAt: new Date().toISOString(), capabilities: ["network", "tool"], source: "collector" },
    { id: "agent_skill:release-review", kind: "agent_skill", name: "Release review", version: "1", publisher: "Internal", artifactSha256: null, evidenceState: "unknown", observedAt: new Date().toISOString(), capabilities: ["filesystem"], source: "manual" },
  ],
  relationships: [],
}, null, 2);

export default function CapabilityGraphPanel({ teamId, role, getAuthHeaders }: { teamId: string; role: string; getAuthHeaders: () => Promise<Record<string, string>> }) {
  const [data, setData] = useState<GraphPayload | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [graphDocument, setGraphDocument] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [policyOpen, setPolicyOpen] = useState(false);
  const [policyDocument, setPolicyDocument] = useState('{\n  "grants": []\n}');
  const canManage = ["owner", "admin", "analyst"].includes(role);

  const load = useCallback(async () => {
    setState("loading"); setError("");
    try {
      const response = await fetch(`/api/teams/${encodeURIComponent(teamId)}/capability-graph`, { headers: await getAuthHeaders() });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(String(body.error || "Capability graph could not be loaded."));
      setData(body as GraphPayload); setState("ready");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Capability graph could not be loaded."); setState("error"); }
  }, [getAuthHeaders, teamId]);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);

  const grouped = useMemo(() => Object.entries(data?.summary.by_kind || {}).filter(([, count]) => count > 0), [data]);
  async function importGraph() {
    setSaving(true); setError("");
    try {
      const parsed = JSON.parse(graphDocument);
      const response = await fetch(`/api/teams/${encodeURIComponent(teamId)}/capability-graph`, { method: "POST", headers: { ...(await getAuthHeaders()), "Content-Type": "application/json" }, body: JSON.stringify(parsed) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(String(body.error || "Capability graph could not be imported."));
      setData(body as GraphPayload); setOpen(false); setGraphDocument("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Capability graph could not be imported."); }
    finally { setSaving(false); }
  }
  async function savePolicy() { setSaving(true); try { const response = await fetch(`/api/teams/${encodeURIComponent(teamId)}/capability-policy`, { method: "PUT", headers: { ...(await getAuthHeaders()), "Content-Type": "application/json" }, body: policyDocument }); const body = await response.json().catch(() => ({})); if (!response.ok) throw new Error(String(body.error || "Capability policy could not be saved.")); setPolicyOpen(false); } catch (cause) { setError(cause instanceof Error ? cause.message : "Capability policy could not be saved."); } finally { setSaving(false); } }
  async function downloadPolicy() { try { const response = await fetch(`/api/teams/${encodeURIComponent(teamId)}/capability-policy/export`, { headers: await getAuthHeaders() }); if (!response.ok) throw new Error(); const url = URL.createObjectURL(await response.blob()); const link = document.createElement("a"); link.href = url; link.download = "guardrails-capability-policy.json"; link.click(); URL.revokeObjectURL(url); } catch { setError("Capability policy export failed."); } }

  return <section className={styles.surface}>
    <header className={styles.title}><div><span>Developer capability control</span><h1>See every executable capability.</h1><p>Extensions, MCP servers, agent skills, CLIs, and browser extensions live in one inventory. GuardRails records what was actually observed and never infers permissions it cannot verify.</p></div><button onClick={() => void load()}><RefreshCw /> Refresh</button></header>
    {error ? <div className={styles.error}><AlertTriangle /><span>{error}</span>{state === "error" ? <button onClick={() => void load()}>Try again</button> : null}</div> : null}
    {data ? <div className={styles.metrics}><article><Box /><strong>{data.summary.subjects}</strong><span>capabilities tracked</span></article><article><ShieldCheck /><strong>{data.summary.verified}</strong><span>artifact-verified</span></article><article><CircleHelp /><strong>{data.summary.unknown_capabilities}</strong><span>need capability evidence</span></article><article><GitBranch /><strong>{data.graph.relationships.length}</strong><span>recorded relationships</span></article></div> : null}
    <div className={styles.kindRow}>{grouped.map(([kind, count]) => <span key={kind}>{label(kind)} <b>{count}</b></span>)}</div>
    {canManage ? <div className={styles.importCard}><div><FileJson /><div><strong>Import collector results</strong><small>Only identity, observed permissions, hashes, and relationships are stored. Local source files and secret values are never imported.</small></div></div><button onClick={() => { setGraphDocument(example); setOpen(true); }}>Import graph</button></div> : null}
    {canManage ? <div className={styles.importCard}><div><ShieldCheck /><div><strong>Capability policy</strong><small>Policies deny by default. Explicit grants are evaluated against the collected graph and exported for CLI enforcement.</small></div></div><div><button onClick={() => setPolicyOpen(true)}>Edit policy</button><button onClick={() => void downloadPolicy()}><Download /> Export</button></div></div> : null}
    {open ? <section className={styles.editor}><header><div><span>Collector import</span><h2>Update non-extension inventory</h2></div><button onClick={() => setOpen(false)}>Cancel</button></header><textarea value={graphDocument} onChange={(event) => setGraphDocument(event.target.value)} spellCheck={false} aria-label="Capability graph JSON" /><footer><small>Extensions already in the workspace inventory remain visible separately and cannot be overwritten here.</small><button className={styles.primary} disabled={saving || !graphDocument.trim()} onClick={() => void importGraph()}>{saving ? <LoaderCircle className={styles.spin} /> : <CheckCircle2 />}{saving ? "Importing..." : "Import capability graph"}</button></footer></section> : null}
    {policyOpen ? <section className={styles.editor}><header><div><span>Capability policy</span><h2>Explicit grants</h2></div><button onClick={() => setPolicyOpen(false)}>Cancel</button></header><textarea value={policyDocument} onChange={(event) => setPolicyDocument(event.target.value)} spellCheck={false} aria-label="Capability policy JSON" /><footer><small>Deny rules override allows. Unobserved capability evidence requires approval.</small><button className={styles.primary} disabled={saving} onClick={() => void savePolicy()}>{saving ? "Saving..." : "Save policy"}</button></footer></section> : null}
    {state === "loading" && !data ? <div className={styles.loading}><LoaderCircle className={styles.spin} /> Loading capability graph...</div> : null}
    {data ? <section className={styles.table}><header><span>Capability</span><span>Evidence</span><span>Observed access</span><span>Identity</span></header>{data.graph.subjects.map((subject) => <article key={subject.id}><div><strong>{subject.name}</strong><small>{label(subject.kind)}{subject.version ? ` @${subject.version}` : ""} · {subject.source}</small></div><span className={styles[subject.evidenceState]}>{subject.evidenceState === "verified" ? "Artifact verified" : subject.evidenceState === "observed" ? "Observed" : "Evidence pending"}</span><span>{subject.capabilities.length ? subject.capabilities.map(label).join(", ") : "Not yet observed"}</span><code title={subject.artifactSha256 || subject.id}>{subject.artifactSha256 ? `${subject.artifactSha256.slice(0, 12)}...` : subject.id}</code></article>)}{!data.graph.subjects.length ? <div className={styles.empty}><Box /><h2>No developer capabilities observed yet.</h2><p>Import a collector graph, then connect a device inventory to establish the first verified release identities.</p></div> : null}</section> : null}
  </section>;
}

function label(value: string) { return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
