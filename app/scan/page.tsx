"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { parseReportBundle, saveImportedReport } from "@/lib/reportBundle";
import type { ImportedReportBundle } from "@/lib/types";

type Tab = "marketplace" | "package" | "report" | "local";

export default function ScanPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("report");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [imported, setImported] = useState<ImportedReportBundle | null>(null);

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
            <p className="eyebrow">Hosted scan</p>
            <h2>Marketplace ID scan</h2>
            <p>API-backed marketplace scans will produce the same scanner bundle contract. This UI is ready for the endpoint once the scanner marketplace command is promoted.</p>
          </div>
          <input placeholder="ms-python.python or marketplace URL" />
          <select defaultValue="standard">
            <option value="quick">quick</option>
            <option value="standard">standard</option>
            <option value="deep">deep</option>
          </select>
          <button type="button" disabled>Endpoint pending</button>
        </section>
      ) : null}

      {tab === "package" ? (
        <section className="hostedScanPanel">
          <div>
            <p className="eyebrow">Hosted scan</p>
            <h2>VSIX / ZIP package scan</h2>
            <p>Package upload scans should call ide-scanner server-side and return a report bundle. Until that API is wired, import scanner-generated bundles directly.</p>
          </div>
          <input type="file" accept=".vsix,.zip,application/zip" disabled />
          <select defaultValue="standard" disabled>
            <option value="quick">quick</option>
            <option value="standard">standard</option>
            <option value="deep">deep</option>
          </select>
          <button type="button" disabled>Endpoint pending</button>
        </section>
      ) : null}
    </main>
  );
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
