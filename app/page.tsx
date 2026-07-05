"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { gradeFromScores, gradeReason } from "@/lib/metrics";
import type { ScanJobPublic, Verdict } from "@/lib/types";

export default function HomePage() {
  const [latest, setLatest] = useState<ScanJobPublic | null>(null);

  useEffect(() => {
    void fetch("/api/scans/history", { cache: "no-store" })
      .then((res) => res.json())
      .then((data: { scans?: ScanJobPublic[] }) => {
        setLatest((data.scans || []).find((scan) => scan.status === "complete" && scan.summary) || null);
      })
      .catch(() => setLatest(null));
  }, []);

  const counts = latest?.summary?.action_counts || { malicious: 0, suspicious: 0, review: 0, clean: 0 };
  const maxRisk = latest?.summary?.summary.max_risk_score || 0;
  const maxMalware = latest?.summary?.summary.max_malware_score || 0;
  const grade = latest ? gradeFromScores(maxRisk, maxMalware, counts as Record<Verdict, number>) : "-";

  return (
    <main className="homeShell">
      <section className="landingHero">
        <div className="landingCopy">
          <p className="eyebrow">IDE extension security</p>
          <h1>Scan VS Code, Cursor, and Windsurf extensions before they become your supply-chain risk.</h1>
          <p>
            A local scanner for developer machines, with a web console for reports, scores, evidence, benchmarks, and production agent uploads.
          </p>
          <div className="landingActions">
            <Link className="primaryAction" href="/scan">Open scanner</Link>
            <Link className="secondaryAction" href="/settings">Deploy agent</Link>
          </div>
        </div>

        <aside className="heroConsole" aria-label="Latest scan preview">
          <div className="consoleHeader">
            <span>Latest report</span>
            <strong>{latest?.source === "agent" ? "Agent upload" : latest ? "Local scan" : "No scan yet"}</strong>
          </div>
          <div className="consoleGrade">
            <strong>{grade}</strong>
            <p>{latest ? gradeReason(maxRisk, maxMalware, counts as Record<Verdict, number>) : "Run a scan or upload an agent report to populate this console."}</p>
          </div>
          <div className="consoleScores">
            <MiniStat label="Extensions" value={latest?.summary?.summary.total_extensions || 0} />
            <MiniStat label="Risk" value={maxRisk} />
            <MiniStat label="Malware" value={maxMalware} />
          </div>
        </aside>
      </section>

      <section className="homeStrip">
        <span>Local-first evidence</span>
        <span>0-100 risk scoring</span>
        <span>Agent upload path</span>
        <span>Version diffing</span>
        <span>Benchmark fixtures</span>
      </section>

      <section className="homeCards">
        <article>
          <IconTile label="1" />
          <h2>Find installed extensions</h2>
          <p>Inventory supported IDE clients and show real extension icons, names, publishers, versions, and install paths.</p>
        </article>
        <article>
          <IconTile label="2" />
          <h2>Score evidence</h2>
          <p>Separate malware confidence from broader risk so suspicious capabilities are not confused with confirmed malicious behavior.</p>
        </article>
        <article>
          <IconTile label="3" />
          <h2>Upload from any OS</h2>
          <p>Run the local agent command on Windows, macOS, or Linux and upload the report to the hosted web console.</p>
        </article>
      </section>

      <section className="agentHero">
        <div>
          <p className="eyebrow">Production command</p>
          <h2>Hosted website plus local agent</h2>
          <p>The browser cannot scan a visitor&apos;s filesystem. This command runs on the machine being scanned and sends the result to the website.</p>
        </div>
        <pre>{`python -m ide_scanner agent --server https://your-app --all`}</pre>
      </section>
    </main>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function IconTile({ label }: { label: string }) {
  return <span className="productIcon">{label}</span>;
}
