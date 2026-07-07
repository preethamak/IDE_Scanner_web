"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { parseReportBundle, saveImportedReport } from "@/lib/reportBundle";
import type { ExtensionSummary, ImportedReportBundle, ScanJobPublic } from "@/lib/types";

type Tab = "marketplace" | "package" | "report" | "local";

function useJobPoll() {
  const [job, setJob] = useState<ScanJobPublic | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current);
  }, []);

  function watch(id: string) {
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(async () => {
      const res = await fetch(`/api/scans/${encodeURIComponent(id)}`, { cache: "no-store" });
      if (!res.ok) return;
      const next = await res.json() as ScanJobPublic;
      setJob(next);
      if (next.status === "complete" || next.status === "failed") {
        if (timer.current) clearInterval(timer.current);
      }
    }, 1500);
  }

  return { job, setJob, watch };
}

export default function ScanPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("report");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [imported, setImported] = useState<ImportedReportBundle | null>(null);

  const [marketplaceId, setMarketplaceId] = useState("");
  const [marketplaceBusy, setMarketplaceBusy] = useState(false);
  const [marketplaceError, setMarketplaceError] = useState("");
  const marketplacePoll = useJobPoll();

  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const uploadPoll = useJobPoll();

  async function startMarketplaceScan() {
    const id = marketplaceId.trim();
    if (!id) {
      setMarketplaceError("Enter a marketplace id, item URL, or vscode: URI");
      return;
    }
    setMarketplaceError("");
    setMarketplaceBusy(true);
    marketplacePoll.setJob(null);
    try {
      const res = await fetch("/api/scans/marketplace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [id] })
      });
      const data = await res.json();
      if (!res.ok) {
        setMarketplaceError(data.error || "Marketplace scan failed to start");
        return;
      }
      marketplacePoll.setJob(data as ScanJobPublic);
      marketplacePoll.watch((data as ScanJobPublic).id);
    } catch {
      setMarketplaceError("Could not reach the scan API");
    } finally {
      setMarketplaceBusy(false);
    }
  }

  async function startUploadScan() {
    if (!uploadFile) {
      setUploadError("Choose a .vsix or .zip package first");
      return;
    }
    setUploadError("");
    setUploadBusy(true);
    uploadPoll.setJob(null);
    try {
      const form = new FormData();
      form.append("file", uploadFile);
      const res = await fetch("/api/scans/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        setUploadError(data.error || "Package scan failed to start");
        return;
      }
      uploadPoll.setJob(data as ScanJobPublic);
      uploadPoll.watch((data as ScanJobPublic).id);
    } catch {
      setUploadError("Could not reach the scan API");
    } finally {
      setUploadBusy(false);
    }
  }

  async function importReport(file: File | null) {
    if (!file) return;
    setStatus("Reading report bundle");
    setError("");
    setImported(null);
    try {
      const bundle = await parseReportBundle(file);
      saveImportedReport(bundle);
      setImported(bundle);
      setStatus("Report imported");
      router.push(`/reports/${encodeURIComponent(bundle.id)}`);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not import report bundle");
      setStatus("");
    }
  }

  return (
    <main className="shell">
      <section className="pageHero scannerHero">
        <div className="heroText">
          <p className="eyebrow">Scan</p>
          <h1>Import scanner output or start a package scan</h1>
          <p className="heroCopy">
            Installed extension scans run in `ide-scanner`. This web app renders report bundles and handles hosted scans for uploaded packages or marketplace IDs.
          </p>
        </div>
        <div className="health ok"><span />Scanner-owned scoring</div>
      </section>

      <section className="scanTabs" role="tablist" aria-label="Scan options">
        <TabButton active={tab === "marketplace"} onClick={() => setTab("marketplace")}>Marketplace ID</TabButton>
        <TabButton active={tab === "package"} onClick={() => setTab("package")}>VSIX / ZIP Upload</TabButton>
        <TabButton active={tab === "report"} onClick={() => setTab("report")}>Import Report</TabButton>
        <TabButton active={tab === "local"} onClick={() => setTab("local")}>Local Dashboard</TabButton>
      </section>

      {error ? <div className="errorBand">{error}</div> : null}
      {status ? <div className="infoBand">{status}</div> : null}

      {tab === "report" ? (
        <section className="importPanel">
          <div>
            <p className="eyebrow">Report bundle</p>
            <h2>Upload `report.zip` from ide-scanner</h2>
            <p>The browser reads `metadata.json`, `summary.json`, and `leaderboard.json`, then stores detail files for lazy extension pages.</p>
          </div>
          <label className="dropZone">
            <input type="file" accept=".zip,application/zip" onChange={(event) => void importReport(event.target.files?.[0] || null)} />
            <strong>Choose report.zip</strong>
            <span>No server upload is required for local viewing.</span>
          </label>
          {imported ? (
            <article className="commandPanel">
              <h2>{imported.metadata.scan_id}</h2>
              <p>{imported.summary.summary.total_extensions} extensions imported.</p>
            </article>
          ) : null}
        </section>
      ) : null}

      {tab === "local" ? (
        <section className="localCommandGrid">
          <CommandCard
            title="Live local dashboard"
            command="ide-scanner scan --installed --ui"
            body="Use this for installed local extensions when you want live progress and lazy detail loading."
          />
          <CommandCard
            title="Export bundle"
            command="ide-scanner scan --installed --profile smart --output report.zip"
            body="Use this when you want to import the report into this website or share a compact dashboard-ready artifact."
          />
          <CommandCard
            title="Deep package scan"
            command="ide-scanner scan --vsix extension.vsix --profile deep --output report.zip"
            body="Use deep mode when dependency and registry enrichment are worth the extra runtime."
          />
        </section>
      ) : null}

      {tab === "marketplace" ? (
        <section className="hostedScanPanel">
          <div>
            <p className="eyebrow">Hosted scan · static only</p>
            <h2>Marketplace ID scan</h2>
            <p>Downloads the published VSIX from the VS Marketplace and runs the full quarantine-extraction static scan against it. Hosted scans never execute extension code.</p>
          </div>
          <div className="hostedScanRow">
            <input
              placeholder="ms-python.python, a marketplace URL, or vscode:extension/..."
              value={marketplaceId}
              onChange={(event) => setMarketplaceId(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && void startMarketplaceScan()}
              disabled={marketplaceBusy}
            />
            <button type="button" onClick={() => void startMarketplaceScan()} disabled={marketplaceBusy}>
              {marketplaceBusy ? "Starting…" : "Scan extension"}
            </button>
          </div>
          {marketplaceError ? <div className="errorBand">{marketplaceError}</div> : null}
          <HostedJobResult job={marketplacePoll.job} />
        </section>
      ) : null}

      {tab === "package" ? (
        <section className="hostedScanPanel">
          <div>
            <p className="eyebrow">Hosted scan · static only</p>
            <h2>VSIX / ZIP package scan</h2>
            <p>Uploads run through the same quarantine-extraction static scan as the CLI. Files are deleted from the server as soon as the scan finishes.</p>
          </div>
          <div className="hostedScanRow">
            <label className="dropZone">
              <input
                type="file"
                accept=".vsix,.zip,application/zip"
                onChange={(event) => setUploadFile(event.target.files?.[0] || null)}
                disabled={uploadBusy}
              />
              <strong>{uploadFile ? uploadFile.name : "Choose a .vsix or .zip package"}</strong>
              <span>Max 50MB. Deleted after scanning.</span>
            </label>
            <button type="button" onClick={() => void startUploadScan()} disabled={uploadBusy || !uploadFile}>
              {uploadBusy ? "Uploading…" : "Scan package"}
            </button>
          </div>
          {uploadError ? <div className="errorBand">{uploadError}</div> : null}
          <HostedJobResult job={uploadPoll.job} />
        </section>
      ) : null}
    </main>
  );
}

function HostedJobResult({ job }: { job: ScanJobPublic | null }) {
  if (!job) return null;
  if (job.status === "queued" || job.status === "running") {
    return <div className="infoBand">Scanning… this can take a moment for large packages.</div>;
  }
  if (job.status === "failed") {
    return <div className="errorBand">{job.error || "Scan failed"}</div>;
  }
  const extensions = job.summary?.top_risk_extensions || [];
  const target = extensions[0];
  if (!target) {
    return <div className="infoBand">Scan complete, but no extension data was returned.</div>;
  }
  return (
    <article className="commandPanel hostedResult">
      <h2>
        {target.name || target.extension_id} <VerdictTag verdict={target.verdict} />
      </h2>
      <p>{target.publisher} · v{target.version} · {target.source}</p>
      {target.scan_incomplete ? <div className="infoBand">{target.skipped_reason || "Scan incomplete"}</div> : null}
      <p>{target.verdict_reason}</p>
      <div className="hostedResultScores">
        <span>Malware score <strong>{target.malware_score}</strong></span>
        <span>Risk score <strong>{target.risk_score}</strong></span>
        <span>Severity <strong>{target.severity}</strong></span>
        <span>Findings <strong>{target.finding_count}</strong></span>
      </div>
      {target.top_findings?.length ? (
        <ul className="hostedResultFindings">
          {target.top_findings.slice(0, 5).map((finding) => (
            <li key={finding.finding_id}>
              <strong>{finding.rule_id}</strong> · {finding.severity} — {finding.evidence_summary}
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}

function VerdictTag({ verdict }: { verdict: ExtensionSummary["verdict"] }) {
  return <span className={`tag ${verdict}`}>{verdict}</span>;
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" className={active ? "active" : ""} onClick={onClick}>{children}</button>;
}

function CommandCard({ title, command, body }: { title: string; command: string; body: string }) {
  return (
    <article className="commandPanel">
      <h2>{title}</h2>
      <p>{body}</p>
      <pre className="jsonPreview">{command}</pre>
    </article>
  );
}
