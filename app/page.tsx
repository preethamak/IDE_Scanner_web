"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { listImportedReports } from "@/lib/reportBundle";
import type { ImportedReportBundle } from "@/lib/types";

export default function HomePage() {
  const [latest, setLatest] = useState<ImportedReportBundle | null>(null);

  useEffect(() => {
    queueMicrotask(() => setLatest(listImportedReports()[0] || null));
  }, []);

  const summary = latest?.summary.summary;

  return (
    <main className="homeShell">
      <section className="landingHero">
        <div className="landingCopy">
          <p className="eyebrow">IDE extension security</p>
          <h1>Security scanner for VS Code, Cursor, Windsurf and VSIX extensions</h1>
          <p>
            ide-scanner decides what is risky. ide-scanner-web imports scanner bundles and renders dashboards, extension details, rules, posture, and benchmarks.
          </p>
          <div className="landingActions">
            <Link className="primaryAction" href="/scan">Scan Extension</Link>
            <Link className="secondaryAction" href="/scan">Upload Report</Link>
            <Link className="secondaryAction" href="/benchmark">View Benchmarks</Link>
          </div>
        </div>

        <aside className="heroConsole" aria-label="Latest imported report preview">
          <div className="consoleHeader">
            <span>Latest bundle</span>
            <strong>{latest ? latest.metadata.profile : "No import yet"}</strong>
          </div>
          <div className="consoleGrade">
            <strong>{summary?.max_risk_score ?? "--"}</strong>
            <p>{latest ? `${latest.metadata.scan_id} imported from ${latest.metadata.source}. Scanner version ${latest.metadata.scanner_version}.` : "Import report.zip to populate this dashboard preview."}</p>
          </div>
          <div className="consoleScores">
            <MiniStat label="Extensions" value={summary?.total_extensions || 0} />
            <MiniStat label="Suspicious" value={summary?.suspicious || 0} />
            <MiniStat label="Malware" value={summary?.max_malware_score || 0} />
          </div>
        </aside>
      </section>

      <section className="homeStrip">
        <span>Report bundle import</span>
        <span>Lazy extension details</span>
        <span>Scanner-owned scores</span>
        <span>Posture viewer</span>
        <span>Benchmark ready</span>
      </section>

      <section className="homeCards">
        <article>
          <IconTile label="1" />
          <h2>Scan locally</h2>
          <p>Run installed extension scans with `ide-scanner scan --installed --profile smart --output report.zip`.</p>
        </article>
        <article>
          <IconTile label="2" />
          <h2>Import bundle</h2>
          <p>Upload `report.zip`; the browser reads summary and leaderboard first, then lazy-loads extension detail files.</p>
        </article>
        <article>
          <IconTile label="3" />
          <h2>Render evidence</h2>
          <p>The website displays scanner-provided grades, verdicts, score explanations, recommendations, and rule metadata.</p>
        </article>
      </section>

      <section className="agentHero">
        <div>
          <p className="eyebrow">Local dashboard command</p>
          <h2>No collector bridge for installed scans</h2>
          <p>Hosted browsers cannot read local extension folders. Installed extension scans should run through the scanner CLI or local dashboard mode.</p>
        </div>
        <pre>{`ide-scanner scan --installed --ui
ide-scanner scan --installed --profile smart --output report.zip`}</pre>
      </section>
    </main>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return <div><span>{label}</span><strong>{value}</strong></div>;
}

function IconTile({ label }: { label: string }) {
  return <span className="productIcon">{label}</span>;
}
