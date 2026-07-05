"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { gradeFromScores, gradeReason } from "@/lib/metrics";
import { buildTriageBuckets, topAction } from "@/lib/triage";
import type { InventoryResponse, ScanJobPublic, Verdict } from "@/lib/types";

export default function DashboardPage() {
  const [inventoryCount, setInventoryCount] = useState(0);
  const [history, setHistory] = useState<ScanJobPublic[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      const [inventoryRes, historyRes] = await Promise.all([
        fetch("/api/inventory", { cache: "no-store" }),
        fetch("/api/scans/history", { cache: "no-store" })
      ]);
      const inventory = await inventoryRes.json() as InventoryResponse & { error?: string };
      const scans = await historyRes.json() as { scans?: ScanJobPublic[]; error?: string };
      if (!inventoryRes.ok || !historyRes.ok) {
        setError(inventory.error || scans.error || "Dashboard data failed to load.");
        return;
      }
      setInventoryCount(inventory.total_extensions || 0);
      setHistory(scans.scans || []);
    }
    void loadDashboard();
  }, []);

  const latest = history.find((scan) => scan.status === "complete" && scan.summary)?.summary || null;
  const counts = latest?.action_counts || { malicious: 0, suspicious: 0, review: 0, clean: 0 };
  const buckets = buildTriageBuckets(latest?.top_risk_extensions || []);
  const maxRisk = latest?.summary.max_risk_score || 0;
  const maxMalware = latest?.summary.max_malware_score || 0;
  const scanned = latest?.summary.total_extensions || 0;
  const posture = latest?.posture_summary;

  return (
    <main className="shell">
      <header className="pageHero compactHero">
        <div className="heroText">
          <p className="eyebrow">Overview</p>
          <h1>Posture</h1>
          <p className="heroCopy">Latest local scan across installed IDE extensions.</p>
        </div>
        <Link className="heroAction primaryAction" href="/scan">New scan</Link>
      </header>

      {error ? <div className="errorBand">{error}</div> : null}

      <section className="statGrid">
        <Stat label="Installed" value={inventoryCount} />
        <Stat label="Scanned" value={scanned} />
        <Stat label="Max risk" value={maxRisk} />
        <Stat label="Max malware" value={maxMalware} />
        <Stat label="Client risk" value={posture?.score || 0} />
      </section>

      <section className="overviewGrid">
        <article className="commandPanel posturePanel">
          <p className="eyebrow">Latest scan</p>
          {latest ? (
            <>
              <div className="postureGrade">
                <strong>{gradeFromScores(maxRisk, maxMalware, counts as Record<Verdict, number>)}</strong>
                <p>{gradeReason(maxRisk, maxMalware, counts as Record<Verdict, number>)}</p>
              </div>
              <div className="scoreDeck" style={{ gridTemplateColumns: "1fr 1fr" }}>
                <MiniScore label="Risk" value={maxRisk} />
                <MiniScore label="Malware" value={maxMalware} />
              </div>
            </>
          ) : (
            <div className="postureGrade">
              <strong>–</strong>
              <p>No completed scan yet. Run a scan to populate posture and triage.</p>
            </div>
          )}
        </article>

        <article className="commandPanel">
          <p className="eyebrow">Verdicts</p>
          <div className="verdictMini">
            <span>Malicious <strong>{counts.malicious || 0}</strong></span>
            <span>Suspicious <strong>{counts.suspicious || 0}</strong></span>
            <span>Review <strong>{counts.review || 0}</strong></span>
            <span>Clean <strong>{counts.clean || 0}</strong></span>
          </div>
        </article>

        <article className="commandPanel">
          <p className="eyebrow">IDE/client risk</p>
          <h2>{posture?.status || "unknown"}</h2>
          <p>{posture ? `${posture.counts.failure} failures and ${posture.counts.warning} warnings across ${posture.clients.length} client(s).` : "Run a scan to evaluate local client posture."}</p>
          <div className="verdictMini">
            {(posture?.top_findings || []).slice(0, 2).map((finding) => (
              <span key={`${finding.client}-${finding.id}`}>{finding.id} <strong>{finding.score}</strong></span>
            ))}
          </div>
        </article>
      </section>

      <div className="sectionHeader">
        <h2>Triage</h2>
        <Link href="/triage">{latest ? topAction(buckets) : "Open triage"}</Link>
      </div>

      <section className="dashboardGrid">
        {buckets.map((bucket) => (
          <article className="commandPanel" key={bucket.id}>
            <p className="eyebrow">{bucket.label}</p>
            <h2>{bucket.extensions.length}</h2>
            <p>{bucket.description}</p>
          </article>
        ))}
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function MiniScore({ label, value }: { label: string; value: number }) {
  return (
    <div className="scoreMeter compact">
      <div className="scoreTop"><span>{label}</span><strong>{value}</strong></div>
      <div className="meterTrack"><span style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div>
    </div>
  );
}
