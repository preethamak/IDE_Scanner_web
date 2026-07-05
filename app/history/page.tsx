"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ScanJobPublic } from "@/lib/types";

export default function HistoryPage() {
  const [scans, setScans] = useState<ScanJobPublic[]>([]);

  useEffect(() => {
    void fetch("/api/scans/history", { cache: "no-store" })
      .then((res) => res.json())
      .then((data: { scans?: ScanJobPublic[] }) => setScans(data.scans || []));
  }, []);

  return (
    <main className="shell">
      <section className="pageHero compactHero">
        <div>
          <p className="eyebrow">History</p>
          <h1>Scan history</h1>
          <p className="heroCopy">Browser-triggered local scans and uploaded agent reports from user machines.</p>
        </div>
        <Link className="heroAction" href="/scan">New scan</Link>
      </section>

      <section className="historyList">
        {scans.length === 0 ? <p>No scan jobs yet.</p> : null}
        {scans.map((scan) => (
          <article className="historyRow" key={scan.id}>
            <div>
              <strong>{scan.status}</strong>
              <span>{scan.source === "agent" ? "agent upload" : "local server"}</span>
              <span>{new Date(scan.createdAt).toLocaleString()}</span>
              {scan.agent?.hostname ? <span>{scan.agent.hostname}</span> : null}
            </div>
            <div>
              <span>{scan.summary?.summary.total_extensions || 0} extensions</span>
              <span>risk {scan.summary?.summary.max_risk_score || 0}</span>
              <span>malware {scan.summary?.summary.max_malware_score || 0}</span>
            </div>
            <Link href={`/api/scans/${scan.id}/report`}>JSON</Link>
          </article>
        ))}
      </section>
    </main>
  );
}
