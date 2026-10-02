"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, CircleAlert, FileJson, Globe2, Search, ShieldCheck } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import type { McpDirectoryEntry } from "@/lib/mcpRegistry";
import styles from "./mcpRegistry.module.css";

type MetricNode = { title?: string; score?: number | null; status?: string; message?: string; children?: MetricNode[] };
type Assessment = { decision?: string; risk_score?: number | null; coverage?: { percent?: number }; metrics?: MetricNode; error?: string };
type QueuedAssessment = { status?: string; request_id?: string; report?: Assessment; error?: string };

export default function McpRegistryClient({ entries }: { entries: McpDirectoryEntry[] }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<McpDirectoryEntry | null>(null);
  const [input, setInput] = useState("");
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle ? entries.filter((entry) => `${entry.name} ${entry.title} ${entry.description}`.toLowerCase().includes(needle)) : entries;
  }, [entries, query]);

  function handleEntry(entry: McpDirectoryEntry) {
    setSelected(entry);
    setAssessment(null);
    setError("");
    setInput(JSON.stringify({ server: { name: entry.name, title: entry.title, description: entry.description, version: entry.version, url: entry.remotes[0]?.url || "", transport: entry.remotes[0]?.type || "streamable-http", officiality: entry.status === "active" ? "official" : "community", source_repo: entry.repositoryUrl } }, null, 2));
  }

  async function assess(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError(""); setAssessment(null);
    try {
      const response = await fetch("/api/mcp/scan", { method: "POST", headers: { "Content-Type": "application/json" }, body: input });
      const body = await response.json().catch(() => ({})) as Assessment & QueuedAssessment;
      if (!response.ok) throw new Error(String(body.error || "Assessment failed."));
      if (response.status === 202 && body.request_id) {
        const completed = await waitForAssessment(body.request_id);
        setAssessment(completed);
      } else {
        setAssessment(body);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Assessment failed.");
    } finally {
      setBusy(false);
    }
  }

  return <main className={styles.page}>
    <section className={styles.hero}>
      <div><span className={styles.eyebrow}><i /> MCP server intelligence</span><h1>See what an MCP server can reach.</h1><p>Start with the public directory, then assess a server descriptor against the same evidence-led metrics GuardRails uses for release review.</p><div className={styles.actions}><Link href="/registry">Extension registry <ArrowRight /></Link><a href="https://registry.modelcontextprotocol.io/docs" target="_blank" rel="noreferrer">Registry documentation <ArrowRight /></a></div></div>
      <aside className={styles.method}><div className={styles.methodHeader}><ShieldCheck /><span>Assessment boundary</span></div><strong>Evidence first</strong><p>GuardRails records what the supplied descriptor and reference extractors prove. Missing transport, package, or source evidence stays explicit.</p><dl><div><dt>12</dt><dd>risk metrics</dd></div><div><dt>0–100</dt><dd>risk score</dd></div><div><dt>Exact</dt><dd>input snapshot</dd></div></dl></aside>
    </section>

    <section className={styles.workspace} aria-label="MCP assessment workspace">
      <div className={styles.directory}><header className={styles.sectionHeader}><div><span className={styles.eyebrow}><i /> Public directory</span><h2>Find a server.</h2></div><span>{entries.length ? `${entries.length} listed` : "Directory unavailable"}</span></header><label className={styles.search}><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name or description" /></label><div className={styles.cards}>{visible.slice(0, 18).map((entry) => <article className={`${styles.card} ${selected?.name === entry.name ? styles.selected : ""}`} key={`${entry.name}-${entry.version}`}><div className={styles.cardTop}><span className={styles.status}>{entry.status}</span><code>{entry.version}</code></div><h3>{entry.title}</h3><code className={styles.serverName}>{entry.name}</code><p>{entry.description}</p><div className={styles.cardFooter}><span><Globe2 /> {entry.remotes.length ? entry.remotes[0].type : "Descriptor only"}</span><button type="button" onClick={() => handleEntry(entry)}>Assess <ArrowRight /></button></div></article>)}</div>{!visible.length ? <div className={styles.empty}><CircleAlert /><strong>No matching servers in the directory.</strong><span>Paste a descriptor into the assessment panel to inspect a private or local server.</span></div> : null}</div>
      <form className={styles.assessor} onSubmit={assess}><header className={styles.sectionHeader}><div><span className={styles.eyebrow}><i /> GuardRails assessment</span><h2>Assess a descriptor.</h2></div><FileJson /></header><p className={styles.assessorIntro}>Paste a JSON server descriptor or choose a directory entry. The full assessment runs the reference extractors, probes the declared transport, and keeps every unavailable metric visible.</p><textarea value={input} onChange={(event) => setInput(event.target.value)} spellCheck={false} placeholder={'{\n  "server": {\n    "name": "example/server",\n    "url": "https://example.test/mcp",\n    "auth_modes": ["oauth"]\n  }\n}'} aria-label="MCP server descriptor" /><button className={styles.primary} type="submit" disabled={busy || !input.trim()}>{busy ? "Assessing…" : "Run assessment"} <ArrowRight /></button>{error ? <p className={styles.error} role="alert">{error}</p> : null}{assessment ? <AssessmentResult report={assessment} /> : <div className={styles.assessmentHint}><CheckCircle2 /><span>Unavailable metrics remain visible. An incomplete input cannot become an allow decision.</span></div>}</form>
    </section>

    <footer className={styles.footer}><span>Directory metadata comes from the <a href="https://registry.modelcontextprotocol.io/" target="_blank" rel="noreferrer">Official MCP Registry</a>.</span><Link href="/research">Read how GuardRails analysis works <ArrowRight /></Link></footer>
  </main>;
}

async function waitForAssessment(requestId: string): Promise<Assessment> {
  for (let attempt = 0; attempt < 45; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 2_000));
    const response = await fetch(`/api/mcp/scan?request_id=${encodeURIComponent(requestId)}`, { cache: "no-store" });
    const body = await response.json().catch(() => ({})) as QueuedAssessment;
    if (!response.ok || body.status === "failed") throw new Error(String(body.error || "The MCP runner failed."));
    if (body.status === "complete" && body.report) return body.report;
  }
  throw new Error("The free MCP runner is still processing. Please try the assessment again shortly.");
}

function AssessmentResult({ report }: { report: Assessment }) {
  const leaves = flatten(report.metrics);
  const decision = String(report.decision || "incomplete");
  return <section className={styles.result} aria-label="MCP assessment result"><header><div><span>Assessment result</span><strong>{decision}</strong></div><div className={styles.resultNumbers}><b>{report.risk_score == null ? "—" : report.risk_score}</b><small>/ 100 risk</small><small>{report.coverage?.percent ?? 0}% covered</small></div></header><div className={styles.metricList}>{leaves.map((metric) => <div key={metric.title}><span>{metric.title}</span><b className={metric.status === "success" ? "" : styles.muted}>{metric.score == null ? "—" : Math.round(metric.score * 100)}</b><small>{metric.message || metric.status}</small></div>)}</div></section>;
}

function flatten(node?: MetricNode): MetricNode[] {
  if (!node) return [];
  if (!node.children?.length) return [node];
  return node.children.flatMap(flatten);
}
