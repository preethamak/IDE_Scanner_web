"use client";

import { useState } from "react";
import type { BenchmarkResult } from "@/lib/types";

export default function BenchmarkPage() {
  const [result, setResult] = useState<BenchmarkResult | null>(null);
  const [status, setStatus] = useState<"idle" | "running" | "error">("idle");
  const [error, setError] = useState("");

  async function runBenchmark() {
    setStatus("running");
    setError("");
    const response = await fetch("/api/benchmark", { cache: "no-store" });
    const data = await response.json() as BenchmarkResult & { error?: string };
    if (!response.ok) {
      setError(data.error || "Benchmark failed");
      setStatus("error");
      return;
    }
    setResult(data);
    setStatus("idle");
  }

  return (
    <main className="shell">
      <section className="pageHero">
        <div>
          <p className="eyebrow">Ground truth</p>
          <h1>Benchmark</h1>
          <p className="heroCopy">Run the scanner against local clean, review, suspicious, and known-malicious fixtures to measure verdict quality.</p>
        </div>
        <button className="primary" type="button" onClick={() => void runBenchmark()} disabled={status === "running"}>
          {status === "running" ? "Running" : "Run benchmark"}
        </button>
      </section>

      {error ? <div className="errorBand">{error}</div> : null}

      <section className="statGrid">
        <Stat label="Accuracy" value={result ? `${Math.round(result.accuracy * 100)}%` : "--"} />
        <Stat label="Recall" value={result ? `${Math.round(result.malicious_recall * 100)}%` : "--"} />
        <Stat label="Correct" value={result ? `${result.correct}/${result.total}` : "--"} />
        <Stat label="False positive" value={result?.false_positive ?? "--"} />
        <Stat label="False negative" value={result?.false_negative ?? "--"} />
      </section>

      <section className="historyList benchmarkList">
        {(result?.rows || []).map((row) => (
          <article className="benchmarkRow" key={row.extension_id}>
            <div>
              <span className={`tag ${row.ok ? "clean" : "malicious"}`}>{row.ok ? "pass" : "miss"}</span>
              <strong>{row.extension_id}</strong>
              <p>{row.reason}</p>
            </div>
            <div className="benchmarkVerdicts">
              <span>Expected <b>{row.expected_verdict}</b></span>
              <span>Actual <b>{row.actual_verdict}</b></span>
              <span>Risk <b>{row.risk_score ?? "--"}</b></span>
              <span>Malware <b>{row.malware_score ?? "--"}</b></span>
            </div>
            <code>{row.top_findings.length ? row.top_findings.join(", ") : "no findings"}</code>
          </article>
        ))}
        {!result ? <p className="emptyCopy">Run the benchmark to see fixture-level verdict quality.</p> : null}
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
