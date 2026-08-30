"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ScanJobPublic } from "@/lib/types";

export default function DiffPage() {
  const [latest, setLatest] = useState<ScanJobPublic | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void fetch("/api/scans/history", { cache: "no-store" })
      .then((res) => res.json())
      .then((data: { scans?: ScanJobPublic[] }) => {
        setLatest((data.scans || []).find((scan) => scan.status === "complete" && scan.summary) || null);
      })
      .catch(() => setError("Scan history could not be loaded. Refresh to try again."));
  }, []);

  const deltas = latest?.summary?.version_deltas || [];

  return (
    <main className="shell">
      <section className="pageHero">
        <div>
          <p className="eyebrow">Version intelligence</p>
          <h1>Diff</h1>
          <p className="heroCopy">Compare the newest scan against the previous completed report to reveal version, dependency, score, and artifact changes.</p>
        </div>
        <Link className="heroAction primaryAction" href="/analyze">Run compare scan</Link>
      </section>

      <section className="historyList benchmarkList">
        {deltas.map((delta) => (
          <article className="benchmarkRow" key={delta.extension_id}>
            <div>
              <span className="tag review">changed</span>
              <strong>{delta.extension_id}</strong>
              <p>{delta.previous_version || "unknown"} to {delta.current_version || "unknown"}</p>
            </div>
            <pre className="diffPreview">{JSON.stringify(delta.changes, null, 2)}</pre>
          </article>
        ))}
        {error ? <p className="emptyCopy" role="alert">{error}</p> : null}
        {!latest && !error ? <p className="emptyCopy">Run at least one scan. A second scan will compare against the first completed report.</p> : null}
        {latest && deltas.length === 0 ? <p className="emptyCopy">No version, dependency, score, or artifact changes were found in the latest scan.</p> : null}
      </section>
    </main>
  );
}
