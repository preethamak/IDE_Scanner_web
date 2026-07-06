"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { buildCollectorReport, type CollectorExtension } from "@/lib/collectorReport";
import { extensionGrade, extensionGradeReason, gradeFromScores, gradeReason, metricCatalog } from "@/lib/metrics";
import type { ExtensionSummary, InventoryExtension, InventoryResponse, LocalScannerUnavailable, ReportSummary, ScanJobPublic, Verdict } from "@/lib/types";

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
  const [agentServer] = useState(() => typeof window === "undefined" ? "" : window.location.origin);
  const [bridgeStatus, setBridgeStatus] = useState<"idle" | "checking" | "connected" | "failed" | "scanning">("idle");
  const [bridgeCount, setBridgeCount] = useState(0);
  const [bridgeError, setBridgeError] = useState("");

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

  const iconByPath = useMemo(() => {
    const icons = new Map<string, string>();
    for (const item of inventory) {
      if (item.icon_path) icons.set(item.path, item.icon_path);
    }
    return icons;
  }, [inventory]);

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
    const data = await response.json() as (InventoryResponse & { error?: string }) | LocalScannerUnavailable;
    if (!response.ok) {
      if ("code" in data && data.code === "LOCAL_SCANNER_UNAVAILABLE") {
        setInventory([]);
        setSelected(new Set());
        setStatus("ready");
        return;
      }
      setError(data.error || "Could not load installed extensions");
      setStatus("error");
      return;
    }
    const inventoryData = data as InventoryResponse;
    setInventory(inventoryData.extensions || []);
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

  async function loadLatestReport() {
    setError("");
    const historyResponse = await fetch("/api/scans/history", { cache: "no-store" });
    const history = await historyResponse.json() as { scans?: ScanJobPublic[]; error?: string };
    const latest = (history.scans || []).find((scan) => scan.status === "complete" && scan.summary);
    if (!historyResponse.ok || !latest) {
      setError(history.error || "No completed collector report found yet");
      setStatus("error");
      return;
    }
    setJobId(latest.id);
    setSummary(latest.summary);
    setActive(null);
    setStatus("report");
  }

  async function connectLocalCollector() {
    setBridgeStatus("checking");
    setBridgeError("");
    try {
      const response = await fetch("http://127.0.0.1:17865/inventory", { cache: "no-store" });
      if (!response.ok) throw new Error(`collector returned HTTP ${response.status}`);
      const payload = await response.json() as { extensions?: CollectorExtension[] };
      setBridgeCount(payload.extensions?.length || 0);
      setBridgeStatus("connected");
    } catch (error) {
      setBridgeStatus("failed");
      setBridgeError(error instanceof Error ? error.message : "Could not connect to local collector");
    }
  }

  async function generateLocalCollectorReport() {
    setBridgeStatus("scanning");
    setBridgeError("");
    try {
      const response = await fetch("http://127.0.0.1:17865/scan", { method: "POST", cache: "no-store" });
      if (!response.ok) throw new Error(`collector returned HTTP ${response.status}`);
      const payload = await response.json() as { extensions?: CollectorExtension[] };
      const { summary: reportSummary } = buildCollectorReport(payload.extensions || []);
      setBridgeCount(payload.extensions?.length || 0);
      setSummary(reportSummary);
      setJobId(null);
      setActive(null);
      setStatus("report");
      setBridgeStatus("connected");
    } catch (error) {
      setBridgeStatus("failed");
      setBridgeError(error instanceof Error ? error.message : "Could not generate local collector report");
    }
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
  const showCollectorFirst = status !== "loading" && !summary && inventory.length === 0;

  const bridgeState = bridgeStatus === "scanning" || status === "scanning" ? "collecting" : summary ? "report" : bridgeStatus === "connected" || inventory.length > 0 ? "connected" : "bridge";

  return (
    <main className="shell">
      <header className="pageHero scannerHero">
        <div className="heroText">
          <p className="eyebrow">Operational security console</p>
          <h1>IDE extension scan desk</h1>
          <p className="heroCopy">Bridge a local collector to this hosted console, generate extension risk reports, and triage VS Code, Cursor, and Windsurf inventory from one workbench.</p>
        </div>
        <div className={`health ${status === "error" ? "bad" : "ok"}`}>
          <span />
          {status === "loading" ? "Initializing" : status === "error" ? "Needs attention" : summary ? "Report loaded" : inventory.length > 0 ? "Collector connected" : "Awaiting bridge"}
        </div>
      </header>

      <section className="scanFlow" aria-label="Hosted scan flow">
        <FlowStep index="01" label="Start bridge" active={bridgeState === "bridge"} done={inventory.length > 0 || Boolean(summary)} />
        <FlowStep index="02" label="Connect collector" active={bridgeState === "connected"} done={inventory.length > 0 || Boolean(summary)} />
        <FlowStep index="03" label="Generate report" active={bridgeState === "collecting"} done={Boolean(summary)} />
        <FlowStep index="04" label="Load latest" active={bridgeState === "report"} done={Boolean(summary)} />
      </section>

      {!showCollectorFirst ? (
        <section className="commandBar">
          <Metric label="Installed" value={inventory.length} />
          <Metric label="Selected" value={selected.size} />
          <Metric label="Scanned" value={summary?.summary?.total_extensions || 0} />
          <div className="commands">
            <button type="button" onClick={() => void loadInventory()}>Connect collector</button>
            <button type="button" onClick={() => void loadLatestReport()}>Load latest report</button>
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
              {status === "scanning" ? "Generating report" : "Generate report"}
            </button>
          </div>
        </section>
      ) : null}

      {error ? <div className="errorBand">{error}</div> : null}

      {showCollectorFirst ? (
        <CollectorLaunch
          server={agentServer}
          bridgeStatus={bridgeStatus}
          bridgeCount={bridgeCount}
          bridgeError={bridgeError}
          onConnect={() => void connectLocalCollector()}
          onGenerate={() => void generateLocalCollectorReport()}
          onLoadLatest={() => void loadLatestReport()}
        />
      ) : (
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
                <ExtensionIcon name={item.display_name || item.name} iconPath={item.icon_path} />
                <span>
                  <strong>{item.display_name || item.name}</strong>
                  <small>{item.extension_id} · {item.version} · {item.type}</small>
                  <code>{item.path}</code>
                </span>
              </label>
            ))}
            {visibleInventory.length === 0 ? (
              <p className="emptyCopy">No server-local extensions are listed. Run the local collector to discover installed extensions on this machine.</p>
            ) : null}
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
                  <span>Decision</span>
                  <strong>{recommendedAction(counts, maxRisk, maxMalware)}</strong>
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
                          <span className="resultIdentity">
                            <ExtensionIcon name={item.extension_id} iconPath={iconByPath.get(item.install_path)} />
                            <strong>{item.extension_id}@{item.version}</strong>
                          </span>
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

                <Detail active={activeResult} iconPath={activeResult ? iconByPath.get(activeResult.install_path) : undefined} />
              </div>
            </div>
          ) : null}
        </section>
      </section>
      )}
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

function FlowStep({ index, label, active, done }: { index: string; label: string; active: boolean; done: boolean }) {
  return (
    <div className={`flowStep ${active ? "active" : ""} ${done ? "done" : ""}`}>
      <span>{index}</span>
      <strong>{label}</strong>
    </div>
  );
}

function recommendedAction(counts: Record<Verdict, number>, risk: number, malware: number): string {
  if (counts.malicious > 0 || malware >= 80) return "Remove or isolate malicious extensions immediately.";
  if (counts.suspicious > 0 || malware >= 45) return "Review suspicious extensions before allowing developer use.";
  if (counts.review > 0 || risk >= 55) return "Review high-risk extensions and confirm publisher intent.";
  return "No urgent extension action. Keep monitoring client posture and versions.";
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
        <span>Collector connected</span>
        <h2>Select inventory and generate a report</h2>
        <p>The local collector is visible to the console. Pick extensions, enable optional checks, then generate a report for triage.</p>
        <div className="scanSteps">
          <article><b>01</b><strong>Scope</strong><small>Filter and select one extension or a focused group.</small></article>
          <article><b>02</b><strong>Score</strong><small>Package evidence is evaluated across {metricCatalog.length} risk domains.</small></article>
          <article><b>03</b><strong>Act</strong><small>Use verdicts, score meters, and findings to decide response.</small></article>
        </div>
      </div>
    </div>
  );
}

function CollectorLaunch({
  server,
  bridgeStatus,
  bridgeCount,
  bridgeError,
  onConnect,
  onGenerate,
  onLoadLatest,
}: {
  server: string;
  bridgeStatus: "idle" | "checking" | "connected" | "failed" | "scanning";
  bridgeCount: number;
  bridgeError: string;
  onConnect: () => void;
  onGenerate: () => void;
  onLoadLatest: () => void;
}) {
  const target = server || "https://ide-scanner-web.vercel.app";
  const macLinuxCommand = `curl -fsSL ${target}/collect-ide-extensions.py -o /tmp/ide-scanner-collector.py
python3 /tmp/ide-scanner-collector.py --serve`;
  const windowsCommand = `curl -fsSL ${target}/collect-ide-extensions.py -o "$env:TEMP\\ide-scanner-collector.py"
py "$env:TEMP\\ide-scanner-collector.py" --serve`;
  const fallbackCommand = `curl -fsSL ${target}/collect-ide-extensions.py -o /tmp/ide-scanner-collector.py
python3 /tmp/ide-scanner-collector.py --server ${target}`;

  return (
    <section className="collectorPanel">
      <div className="collectorLead">
        <span className="eyebrow">Local bridge model</span>
        <h2>Start the local bridge, then scan from this page</h2>
        <p>Use the bridge command on the machine you want to inspect. The website talks to <code>127.0.0.1:17865</code>, reads installed-extension metadata, and generates the dashboard in your browser. Extension files stay local.</p>
        <div className="collectorActions">
          <button type="button" onClick={onConnect} disabled={bridgeStatus === "checking" || bridgeStatus === "scanning"}>
            {bridgeStatus === "checking" ? "Connecting" : "Connect local collector"}
          </button>
          <button className="primary" type="button" onClick={onGenerate} disabled={bridgeStatus !== "connected"}>
            {bridgeStatus === "scanning" ? "Generating" : "Generate report"}
          </button>
          <button type="button" onClick={onLoadLatest}>Load saved report</button>
          <a className="panelLink" href="/history">Open history</a>
        </div>
        <div className={`bridgeStatus ${bridgeStatus}`}>
          <strong>{bridgeStatus === "connected" ? `${bridgeCount} extensions available` : bridgeStatus === "failed" ? "Collector not reachable" : "Waiting for bridge"}</strong>
          <span>{bridgeError || "Run the bridge command below and keep that terminal open while scanning."}</span>
        </div>
      </div>

      <div className="collectorCommands">
        <article>
          <strong>Start local bridge · macOS / Linux</strong>
          <pre>{macLinuxCommand}</pre>
        </article>
        <article>
          <strong>Start local bridge · Windows with Python</strong>
          <pre>{windowsCommand}</pre>
        </article>
        <article>
          <strong>One-shot upload fallback</strong>
          <pre>{fallbackCommand}</pre>
        </article>
      </div>

      <div className="collectorFacts">
        <article><b>01</b><strong>Start local bridge</strong><span>Run the command on the developer workstation or build image.</span></article>
        <article><b>02</b><strong>Connect collector</strong><span>The hosted website queries the local bridge directly.</span></article>
        <article><b>03</b><strong>Generate report</strong><span>Review versions, contribution surfaces, scripts, startup behavior, and dependency counts.</span></article>
        <article><b>04</b><strong>Fallback upload</strong><span>Use one-shot upload only when localhost browser access is blocked.</span></article>
      </div>
    </section>
  );
}

function Scanning() {
  return (
    <div className="startState">
      <div className="spinner" />
      <h2>Generating extension report</h2>
      <p>Large extension bundles can take time because files, manifests, scripts, and packaged artifacts are inspected locally.</p>
    </div>
  );
}

function Detail({ active, iconPath }: { active: ExtensionSummary | null; iconPath?: string }) {
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
      <div className="detailTitle">
        <ExtensionIcon name={active.extension_id} iconPath={iconPath} large />
        <div>
          <h3>{active.extension_id}@{active.version}</h3>
          <span>{active.publisher || "unknown publisher"}</span>
        </div>
      </div>
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
      <CollectorDetails active={active} />
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

function CollectorDetails({ active }: { active: ExtensionSummary }) {
  const details = active.collector_details || {};
  const activationEvents = stringArray(details.activation_events);
  const scripts = objectValue(details.scripts);
  const contributes = objectValue(details.contributes);
  const contributionEntries = Object.entries(contributes);
  const dependencyCount = Number(details.dependency_count || 0);
  const main = typeof details.main === "string" ? details.main : "";
  const browser = typeof details.browser === "string" ? details.browser : "";

  if (!activationEvents.length && Object.keys(scripts).length === 0 && contributionEntries.length === 0 && dependencyCount === 0 && !main && !browser) {
    return null;
  }

  return (
    <section className="collectorDetail">
      <div className="scoreBreakdownHead">
        <span>Installed metadata</span>
        <strong>{active.source}</strong>
      </div>
      <div className="collectorMetaGrid">
        {main ? <span><b>Main</b><code>{main}</code></span> : null}
        {browser ? <span><b>Browser</b><code>{browser}</code></span> : null}
        <span><b>Dependencies</b><strong>{dependencyCount}</strong></span>
        {typeof details.engine_vscode === "string" && details.engine_vscode ? <span><b>VS Code engine</b><code>{details.engine_vscode}</code></span> : null}
      </div>
      {activationEvents.length ? <TagList label="Activation" values={activationEvents.slice(0, 10)} /> : null}
      {Object.keys(scripts).length ? <TagList label="Lifecycle scripts" values={Object.keys(scripts)} /> : null}
      {contributionEntries.length ? (
        <div className="contributionList">
          {contributionEntries.slice(0, 8).map(([name, value]) => (
            <span key={name}><b>{name}</b><small>{contributionCount(value)} item(s)</small></span>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function TagList({ label, values }: { label: string; values: string[] }) {
  return (
    <div className="collectorTags">
      <strong>{label}</strong>
      <span>{values.map((value) => <code key={value}>{value}</code>)}</span>
    </div>
  );
}

function contributionCount(value: unknown): number {
  if (Array.isArray(value)) return value.length;
  if (value && typeof value === "object" && "count" in value && typeof value.count === "number") return value.count;
  if (value && typeof value === "object") return Object.keys(value).length;
  return 1;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function ExtensionIcon({ name, iconPath, large = false }: { name: string; iconPath?: string; large?: boolean }) {
  const src = iconPath ? `/api/extension-icons?path=${encodeURIComponent(iconPath)}` : "";
  const initials = name
    .split(/[.\s_-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "EX";
  return (
    <span className={`extensionIcon ${large ? "large" : ""}`}>
      {src ? <Image src={src} alt="" width={large ? 48 : 34} height={large ? 48 : 34} unoptimized /> : <b>{initials}</b>}
    </span>
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
