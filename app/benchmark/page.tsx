"use client";

import { useMemo, useState } from "react";
import { listImportedBenchmarks, parseBenchmarkBundle, saveImportedBenchmark } from "@/lib/reportBundle";
import type { BenchmarkBundle, BenchmarkResult } from "@/lib/types";

export default function BenchmarkPage() {
  const [result, setResult] = useState<BenchmarkResult | null>(null);
  const [benchmarks, setBenchmarks] = useState<BenchmarkBundle[]>(() => listImportedBenchmarks());
  const [selectedId, setSelectedId] = useState("");
  const [status, setStatus] = useState<"idle" | "running" | "importing" | "error">("idle");
  const [error, setError] = useState("");

  const selected = useMemo(
    () => benchmarks.find((item) => item.id === selectedId) || benchmarks[0] || null,
    [benchmarks, selectedId],
  );
  const quality = selected ? benchmarkQuality(selected.benchmark_summary) : null;

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

  async function importBenchmark(file: File | null) {
    if (!file) return;
    setStatus("importing");
    setError("");
    try {
      const bundle = await parseBenchmarkBundle(file);
      saveImportedBenchmark(bundle);
      const imported = listImportedBenchmarks();
      setBenchmarks(imported);
      setSelectedId(bundle.id);
      setStatus("idle");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not import benchmark bundle");
      setStatus("error");
    }
  }

  return (
    <main className="shell">
      <section className="pageHero">
        <div>
          <p className="eyebrow">Ground truth</p>
          <h1>Benchmarks</h1>
          <p className="heroCopy">Import scanner-generated `benchmark.zip` files or run the bundled fixture benchmark through the local bridge.</p>
        </div>
        <div className="heroActions">
          <label className="secondaryAction fileAction">
            <input type="file" accept=".zip,application/zip" onChange={(event) => void importBenchmark(event.target.files?.[0] || null)} />
            Import benchmark.zip
          </label>
          <button className="primary" type="button" onClick={() => void runBenchmark()} disabled={status === "running"}>
            {status === "running" ? "Running" : "Run fixtures"}
          </button>
        </div>
      </section>

      {error ? <div className="errorBand">{error}</div> : null}

      {selected ? (
        <>
          <section className="reportControls">
            <label>
              Benchmark
              <select value={selected.id} onChange={(event) => setSelectedId(event.target.value)}>
                {benchmarks.map((item) => (
                  <option value={item.id} key={item.id}>{item.metadata.dataset_id} - {item.metadata.benchmark_id}</option>
                ))}
              </select>
            </label>
            <div>
              <span className="mutedLabel">Scanner</span>
              <strong>{selected.metadata.scanner_version || "--"}</strong>
            </div>
            <div>
              <span className="mutedLabel">Ruleset</span>
              <strong>{selected.metadata.ruleset_version || "--"}</strong>
            </div>
          </section>

          <section className="statGrid benchmarkStats">
            <Stat label="Precision" value={`${Math.round(selected.benchmark_summary.precision * 100)}%`} />
            <Stat label="Recall" value={`${Math.round(selected.benchmark_summary.recall * 100)}%`} />
            <Stat label="F1" value={`${Math.round((quality?.f1 || 0) * 100)}%`} />
            <Stat label="Specificity" value={`${Math.round((quality?.specificity || 0) * 100)}%`} />
            <Stat label="Dataset coverage" value={`${Math.round((quality?.coverage || 0) * 100)}%`} />
            <Stat label="Not scanned" value={selected.benchmark_summary.not_scanned} />
            <Stat label="True positives" value={selected.benchmark_summary.true_positives} />
            <Stat label="False positives" value={selected.benchmark_summary.false_positives} />
            <Stat label="False negatives" value={selected.benchmark_summary.false_negatives} />
          </section>

          <section className="benchmarkDefinitions">
            <article><strong>Precision</strong><p>Of items flagged positive, the share that ground truth labels positive. High precision means less analyst noise.</p></article>
            <article><strong>Recall</strong><p>Of ground-truth positives, the share detected. High recall means fewer missed threats.</p></article>
            <article><strong>F1</strong><p>Harmonic mean of precision and recall. Useful for comparison only when datasets and coverage are identical.</p></article>
            <article><strong>Specificity</strong><p>Of ground-truth negatives, the share correctly left negative. This exposes false-positive pressure.</p></article>
            <article><strong>Dataset coverage</strong><p>Share of dataset artifacts actually evaluated. Unscanned items are not silently counted as correct negatives.</p></article>
          </section>

          <section className="historyList benchmarkList">
            {selected.leaderboard.extensions.slice(0, 80).map((row) => (
              <article className="benchmarkRow" key={row.extension_id}>
                <div>
                  <span className={`tag ${row.outcome === "true_positive" || row.outcome === "true_negative" ? "clean" : row.outcome === "not_scanned" ? "review" : "malicious"}`}>{row.outcome.replaceAll("_", " ")}</span>
                  <strong>{row.extension_id}</strong>
                  <p>{row.exposure_types.length ? row.exposure_types.join(", ") : row.label}</p>
                </div>
                <div className="benchmarkVerdicts">
                  <span>Expected <b>{row.expected_findings.length ? row.expected_findings.length : "--"}</b></span>
                  <span>Matched <b>{row.matched_findings.length}</b></span>
                  <span>Risk <b>{row.risk_score ?? "--"}</b></span>
                  <span>Severity <b>{row.severity}</b></span>
                </div>
                <code>{row.matched_findings.length ? row.matched_findings.join(", ") : row.ide_scanner_findings.slice(0, 4).join(", ") || "no scanner findings"}</code>
              </article>
            ))}
          </section>

          <section className="historyList benchmarkList">
            {selected.rule_coverage.rules.map((rule) => (
              <article className="benchmarkRow compactBenchmarkRow" key={rule.rule_id}>
                <div>
                  <strong>{rule.rule_id}</strong>
                  <p>{rule.detections}/{rule.expected} expected detections</p>
                </div>
                <div className="benchmarkVerdicts">
                  <span>Precision <b>{Math.round(rule.precision * 100)}%</b></span>
                  <span>Recall <b>{Math.round(rule.recall * 100)}%</b></span>
                </div>
                <code>{rule.false_positives} false positives</code>
              </article>
            ))}
          </section>
        </>
      ) : null}

      {!selected ? <p className="emptyCopy">Import `benchmark.zip` to view dataset metrics, rule coverage, and extension-level matches.</p> : null}

      {result ? (
        <section className="historyList benchmarkList">
          {result.rows.map((row) => (
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
        </section>
      ) : null}
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

function benchmarkQuality(summary: BenchmarkBundle["benchmark_summary"]) {
  const f1Denominator = summary.precision + summary.recall;
  const negativeTotal = summary.true_negatives + summary.false_positives;
  return {
    f1: f1Denominator ? (2 * summary.precision * summary.recall) / f1Denominator : 0,
    specificity: negativeTotal ? summary.true_negatives / negativeTotal : 0,
    coverage: summary.total_extensions ? summary.evaluated_extensions / summary.total_extensions : 0
  };
}
