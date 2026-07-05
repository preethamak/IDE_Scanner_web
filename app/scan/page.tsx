"use client";

import { useEffect, useMemo, useState } from "react";
import { extensionGrade, extensionGradeReason, gradeFromScores, gradeReason, metricCatalog } from "@/lib/metrics";
import { buildTriageBuckets, topAction } from "@/lib/triage";
import type { ExtensionSummary, InventoryExtension, InventoryResponse, ReportSummary, ScanJobPublic, Verdict } from "@/lib/types";

const verdictRank: Record<string, number> = {
  malicious: 4,
  suspicious: 3,
  review: 2,
  clean: 1
};

export default function Home() {
  const [inventory, setInventory] = useState<InventoryExtension[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [online, setOnline] = useState(false);
  const [sandbox, setSandbox] = useState(false);
  const [allowExecute, setAllowExecute] = useState(false);
  const [status, setStatus] = useState<"loading" | "ready" | "scanning" | "report" | "error">("loading");
  const [jobId, setJobId] = useState<string | null>(null);
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [active, setActive] = useState<ExtensionSummary | null>(null);
  const [filter, setFilter] = useState<Verdict | "">("");
  const [error, setError] = useState("");

  useEffect(() => {
    void loadInventory();
  }, []);

  const visibleInventory = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return inventory;
    return inventory.filter((item) => {
      const text = `${item.extension_id} ${item.display_name} ${item.publisher} ${item.version} ${item.path}`.toLowerCase();
      return text.includes(needle);
    });
  }, [inventory, query]);

  const results = useMemo(() => {
    const items = summary?.top_risk_extensions || [];
    return items
      .filter((item) => !filter || item.verdict === filter)
      .sort((a, b) => {
        return (
          (verdictRank[b.verdict] || 0) - (verdictRank[a.verdict] || 0) ||
          (b.risk_score || 0) - (a.risk_score || 0) ||
          a.extension_id.localeCompare(b.extension_id)
        );
      });
  }, [summary, filter]);

  const activeResult = active && results.some((item) => item.install_path === active.install_path) ? active : results[0] || null;

  async function loadInventory() {
    setStatus("loading");
    setError("");
    const response = await fetch("/api/inventory", { cache: "no-store" });
    const data = await response.json() as InventoryResponse & { error?: string };
    if (!response.ok) {
      setError(data.error || "Could not load installed extensions");
      setStatus("error");
      return;
    }
    setInventory(data.extensions || []);
    setSelected(new Set());
    setStatus("ready");
  }

  function togglePath(path: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  function toggleVisible() {
    const allVisibleSelected = visibleInventory.length > 0 && visibleInventory.every((item) => selected.has(item.path));
    setSelected((current) => {
      const next = new Set(current);
      for (const item of visibleInventory) {
        if (allVisibleSelected) next.delete(item.path);
        else next.add(item.path);
      }
      return next;
    });
  }

  async function startScan() {
    setStatus("scanning");
    setError("");
    setSummary(null);
    setActive(null);
    const response = await fetch("/api/scans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        extension_paths: [...selected],
        online,
        sandbox,
        allow_execute: sandbox && allowExecute
      })
    });
    const job = await response.json() as ScanJobPublic & { error?: string };
    if (!response.ok) {
      setError(job.error || "Could not start scan");
      setStatus("error");
      return;
    }
    setJobId(job.id);
    void pollJob(job.id);
  }

  async function pollJob(id: string) {
    const response = await fetch(`/api/scans/${id}`, { cache: "no-store" });
    const job = await response.json() as ScanJobPublic & { error?: string };
    if (!response.ok || job.status === "failed") {
      setError(job.error || "Scan failed");
      setStatus("error");
      return;
    }
    if (job.status !== "complete") {
      setTimeout(() => void pollJob(id), 900);
      return;
    }
    setSummary(job.summary);
    setStatus("report");
  }

  async function downloadReport() {
    if (!jobId) return;
    const response = await fetch(`/api/scans/${jobId}/report`, { cache: "no-store" });
    const report = await response.json();
    if (!response.ok) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ide-scanner-report-${jobId}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const counts = summary?.action_counts || { malicious: 0, suspicious: 0, review: 0, clean: 0 };
  const maxRisk = summary?.summary?.max_risk_score || 0;
  const maxMalware = summary?.summary?.max_malware_score || 0;
  const posture = summary?.posture_summary;
  const triageBuckets = buildTriageBuckets(summary?.top_risk_extensions || []);

  return (
    <main className="shell">
      <header className="pageHero compactHero">
        <div className="heroText">
          <p className="eyebrow">Scanner</p>
          <h1>Scan extensions</h1>
          <p className="heroCopy">Select installed extensions, run a static scan, and export the report.</p>
        </div>
        <div className={`health ${status === "error" ? "bad" : "ok"}`}>
          <span />
          {status === "loading" ? "Loading scanner" : status === "error" ? "Needs attention" : "Local API online"}
        </div>
      </header>

      <section className="commandBar">
        <Metric label="Installed" value={inventory.length} />
        <Metric label="Selected" value={selected.size} />
        <Metric label="Scanned" value={summary?.summary?.total_extensions || 0} />
        <div className="commands">
          <button type="button" onClick={() => void loadInventory()}>Refresh</button>
          <button type="button" onClick={toggleVisible}>Select visible</button>
          <label className="switch">
            <input type="checkbox" checked={online} onChange={(event) => setOnline(event.target.checked)} />
            <span>Online checks</span>
          </label>
          <label className="switch">
            <input type="checkbox" checked={sandbox} onChange={(event) => setSandbox(event.target.checked)} />
            <span>Sandbox observations</span>
          </label>
          <label className="switch">
            <input type="checkbox" checked={allowExecute} disabled={!sandbox} onChange={(event) => setAllowExecute(event.target.checked)} />
            <span>Execute sandbox</span>
          </label>
          <button className="primary" type="button" disabled={selected.size === 0 || status === "scanning"} onClick={() => void startScan()}>
            {status === "scanning" ? "Scanning" : "Scan selected"}
          </button>
        </div>
      </section>

      {error ? <div className="errorBand">{error}</div> : null}

      <section className="workbench">
        <aside className="inventory">
          <div className="panelHead">
            <div>
              <h2>Extensions</h2>
              <p>VS Code, Cursor, Windsurf</p>
            </div>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter" />
          </div>
          <div className="extensionList">
            {visibleInventory.map((item) => (
              <label className="extensionRow" key={item.path}>
                <input type="checkbox" checked={selected.has(item.path)} onChange={() => togglePath(item.path)} />
                <span>
                  <strong>{item.display_name || item.name}</strong>
                  <small>{item.extension_id} · {item.version} · {item.type}</small>
                  <code>{item.path}</code>
                </span>
              </label>
            ))}
            {visibleInventory.length === 0 ? <p className="emptyCopy">No extensions match this filter.</p> : null}
          </div>
        </aside>

        <section className="report">
          {status === "scanning" ? <Scanning /> : null}
          {status !== "scanning" && !summary ? <StartState /> : null}
          {summary ? (
            <div className="reportBody">
              <div className="reportTitle">
                <div>
                  <p className="eyebrow">Scan report</p>
                  <h2>{summary.summary?.total_extensions || 0} extensions inspected</h2>
                </div>
                <button type="button" onClick={() => void downloadReport()}>Download JSON</button>
              </div>

              <section className="reportBrief">
                <div>
                  <span>Recommended action</span>
                  <strong>{topAction(triageBuckets)}</strong>
                </div>
                <div>
                  <span>Score model</span>
                  <strong>Risk and malicious confidence are scored separately on a 0-100 scale.</strong>
                </div>
              </section>

              <div className="scoreDeck">
                <ScoreMeter label="Max risk score" value={maxRisk} note="Abuse potential, sensitive capability, provenance, and dependency risk." />
                <ScoreMeter label="Max malware score" value={maxMalware} note="Confirmed or correlated evidence of malicious behavior." />
                <div className="gradeCard">
                  <span>Overall grade</span>
                  <strong>{gradeFromScores(maxRisk, maxMalware, counts)}</strong>
                  <p>{gradeReason(maxRisk, maxMalware, counts)}</p>
                </div>
              </div>

              <section className="clientRiskPanel">
                <div className="clientRiskScore">
                  <span>IDE/client setup risk</span>
                  <strong>{posture?.score ?? 0}</strong>
                  <p>{posture ? `${posture.status} posture across ${posture.clients.length || 0} detected client(s).` : "Posture data was not returned by this scan."}</p>
                </div>
                <div className="postureCounts">
                  <span><b>{posture?.counts.failure ?? 0}</b>Failures</span>
                  <span><b>{posture?.counts.warning ?? 0}</b>Warnings</span>
                  <span><b>{posture?.counts.success ?? 0}</b>Passing</span>
                </div>
                <div className="postureFindings">
                  {(posture?.top_findings || []).slice(0, 3).map((finding) => (
                    <article key={`${finding.client}-${finding.id}`}>
                      <strong>{finding.client} · {finding.id}</strong>
                      <p>{finding.reason}</p>
                    </article>
                  ))}
                  {posture && posture.top_findings.length === 0 ? <p>No risky client posture metrics were found.</p> : null}
                </div>
              </section>

              <div className="verdicts">
                <VerdictCard label="Malicious" value={counts.malicious || 0} tone="red" />
                <VerdictCard label="Suspicious" value={counts.suspicious || 0} tone="amber" />
                <VerdictCard label="Review" value={counts.review || 0} tone="blue" />
                <VerdictCard label="Clean" value={counts.clean || 0} tone="green" />
              </div>

              <div className="reportGrid">
                <div>
                  <div className="sectionHead">
                    <h3>Ranked output</h3>
                    <select value={filter} onChange={(event) => setFilter(event.target.value as Verdict | "")}>
                      <option value="">All</option>
                      <option value="malicious">Malicious</option>
                      <option value="suspicious">Suspicious</option>
                      <option value="review">Review</option>
                      <option value="clean">Clean</option>
                    </select>
                  </div>
                  <div className="resultList">
                    {results.map((item) => (
                      <button className="resultCard" type="button" key={`${item.install_path}-${item.extension_id}`} onClick={() => setActive(item)}>
                        <span className="resultTopline">
                          <strong>{item.extension_id}@{item.version}</strong>
                          <b>{extensionGrade(item)}</b>
                        </span>
                        <small>{item.install_path}</small>
                        <span className="miniBars" aria-hidden="true">
                          <i><em style={{ width: `${Math.max(0, Math.min(100, item.risk_score || 0))}%` }} /></i>
                          <i><em style={{ width: `${Math.max(0, Math.min(100, item.malware_score || 0))}%` }} /></i>
                        </span>
                        <span className="tagLine">
                          <Tag tone={item.verdict}>{item.verdict}</Tag>
                          <Tag>{item.severity}</Tag>
                          <Tag>Risk {item.risk_score || 0}</Tag>
                          <Tag>Malware {item.malware_score || 0}</Tag>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <Detail active={activeResult} />
              </div>
            </div>
          ) : null}
        </section>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function VerdictCard({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className={`verdict ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Tag({ children, tone = "" }: { children: React.ReactNode; tone?: string }) {
  return <span className={`tag ${tone}`}>{children}</span>;
}

function StartState() {
  return (
    <div className="startState">
      <div className="scanGuide">
        <span>Ready</span>
        <h2>Select extensions and run a scan</h2>
        <p>The scanner runs locally, reads installed extension packages, and produces a private report with scores, findings, and recommendations.</p>
        <div className="scanSteps">
          <article><b>1</b><strong>Select</strong><small>Choose one extension or scan a filtered group.</small></article>
          <article><b>2</b><strong>Inspect</strong><small>Static package evidence is scored across {metricCatalog.length} domains.</small></article>
          <article><b>3</b><strong>Triage</strong><small>Use verdicts, score meters, and recommendations to decide action.</small></article>
        </div>
      </div>
    </div>
  );
}

function Scanning() {
  return (
    <div className="startState">
      <div className="spinner" />
      <h2>Scanning selected extensions</h2>
      <p>Large extension bundles can take time because files, manifests, scripts, and packaged artifacts are inspected locally.</p>
    </div>
  );
}

function Detail({ active }: { active: ExtensionSummary | null }) {
  if (!active) {
    return (
      <aside className="detail">
        <h3>No result selected</h3>
        <p>Choose a ranked extension to inspect findings and evidence.</p>
      </aside>
    );
  }

  return (
    <aside className="detail">
      <h3>{active.extension_id}@{active.version}</h3>
      <p>{active.verdict_reason}</p>
      <div className="detailScores">
        <ScoreMeter label="Risk score" value={active.risk_score || 0} note="Review priority on a 0-100 scale." compact />
        <ScoreMeter label="Malware score" value={active.malware_score || 0} note="Malicious confidence on a 0-100 scale." compact />
      </div>
      <div className="gradeStrip">
        <strong>{extensionGrade(active)}</strong>
        <span>{extensionGradeReason(active)}</span>
      </div>
      <ScoreBreakdown active={active} />
      <div className="tagLine">
        <Tag tone={active.verdict}>{active.verdict}</Tag>
        <Tag>{active.severity}</Tag>
        <Tag>{active.finding_count} findings</Tag>
      </div>
      {(active.top_findings || []).map((finding) => (
        <article className="finding" key={finding.finding_id}>
          <h4>{finding.rule_id}</h4>
          <small>{finding.category} · {finding.severity} · confidence {finding.confidence}</small>
          <p>{finding.evidence_summary}</p>
          {finding.file_refs?.length ? <code>{finding.file_refs.join(", ")}</code> : null}
          {finding.recommendation ? <p className="recommendation">{finding.recommendation}</p> : null}
        </article>
      ))}
    </aside>
  );
}

function ScoreBreakdown({ active }: { active: ExtensionSummary }) {
  const components = active.score_details?.components || {};
  const entries = Object.entries(components)
    .filter(([, value]) => Number(value) > 0)
    .sort((a, b) => Number(b[1]) - Number(a[1]));

  return (
    <section className="scoreBreakdown">
      <div className="scoreBreakdownHead">
        <span>Why this score</span>
        <strong>{active.score_details?.basis || "none"} · {active.score_details?.confidence || "high"} confidence</strong>
      </div>
      {entries.length ? entries.map(([name, value]) => (
        <div className="componentBar" key={name}>
          <span>{name.replaceAll("_", " ")}</span>
          <i><em style={{ width: `${Math.max(0, Math.min(100, Number(value)))}%` }} /></i>
          <b>{value}</b>
        </div>
      )) : <p>No score-driving components. Findings are contextual or non-actionable.</p>}
      {(active.score_details?.suppressors || []).length ? (
        <div className="suppressors">
          {(active.score_details?.suppressors || []).map((item) => (
            <span key={item.id}>{item.id}: {item.reason}</span>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function ScoreMeter({ label, value, note, compact = false }: { label: string; value: number; note: string; compact?: boolean }) {
  const clamped = Math.max(0, Math.min(100, value || 0));
  return (
    <div className={`scoreMeter ${compact ? "compact" : ""}`}>
      <div className="scoreTop">
        <span>{label}</span>
        <strong>{clamped}</strong>
      </div>
      <div className="meterTrack" aria-label={`${label}: ${clamped} out of 100`}>
        <span style={{ width: `${clamped}%` }} />
      </div>
      <p>{note}</p>
    </div>
  );
}
