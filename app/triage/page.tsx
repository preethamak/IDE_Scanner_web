"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { buildTriageBuckets } from "@/lib/triage";
import type { ScanJobPublic } from "@/lib/types";

export default function TriagePage() {
  const [latest, setLatest] = useState<ScanJobPublic | null>(null);

  useEffect(() => {
    void fetch("/api/scans/history", { cache: "no-store" })
      .then((res) => res.json())
      .then((data: { scans?: ScanJobPublic[] }) => {
        setLatest((data.scans || []).find((scan) => scan.status === "complete" && scan.summary) || null);
      });
  }, []);

  const buckets = useMemo(() => buildTriageBuckets(latest?.summary?.top_risk_extensions || []), [latest]);

  return (
    <main className="shell">
      <section className="pageHero compactHero">
        <div>
          <p className="eyebrow">Action center</p>
          <h1>Triage queue</h1>
          <p className="heroCopy">The same report, grouped by what you should do next instead of raw score order.</p>
        </div>
        <Link className="heroAction" href="/scan">Run new scan</Link>
      </section>

      {!latest ? (
        <section className="commandPanel soloPanel">
          <h2>No completed scan</h2>
          <p>Run a scan first. Triage queues will appear here when a report is available.</p>
        </section>
      ) : (
        <section className="triageBoard">
          {buckets.map((bucket) => (
            <article className="triageColumn" key={bucket.id}>
              <div className="sectionHead">
                <div>
                  <p className="eyebrow">{bucket.extensions.length} items</p>
                  <h2>{bucket.label}</h2>
                </div>
              </div>
              <p>{bucket.description}</p>
              {bucket.extensions.map((extension) => (
                <Link className="triageItem" href={`/extensions/${extension.instance_id}`} key={extension.instance_id}>
                  <strong>{extension.extension_id}</strong>
                  <span>{extension.verdict} · risk {extension.risk_score} · malware {extension.malware_score}</span>
                </Link>
              ))}
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
