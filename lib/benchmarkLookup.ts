import { benchmarkRows } from "@/lib/websiteBenchmarkRows";
import { websiteBenchmark } from "@/lib/websiteBenchmark";

export type BenchmarkValidation = {
  id: string;
  version: string;
  sha256: string;
  split: string;
  classification: string;
  firstDecision: string;
  finalDecision: string;
  finalSeverity: string;
  publishedAt: string;
};

const byKey = new Map(benchmarkRows.map((row) => [`${row.id.toLowerCase()}@${row.version}`, row]));

/**
 * A report is "independently validated" only when the exact artifact (id + version)
 * is in the frozen corpus AND its recorded SHA-256 matches. Version alone is not
 * enough — the whole point of the benchmark is exact-artifact identity.
 */
export function benchmarkValidation(id: string, version: string, sha256?: string | null): BenchmarkValidation | null {
  const row = byKey.get(`${id.toLowerCase()}@${version}`);
  if (!row) return null;
  if (sha256 && sha256.toLowerCase() !== row.sha256.toLowerCase()) return null;
  return {
    id: row.id,
    version: row.version,
    sha256: row.sha256,
    split: row.split,
    classification: row.classification,
    firstDecision: row.first_decision,
    finalDecision: row.final_decision,
    finalSeverity: row.final_severity,
    publishedAt: websiteBenchmark.publishedAt,
  };
}
