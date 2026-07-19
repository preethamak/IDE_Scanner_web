import { publicDb } from "@/lib/supabase";
import { benchmarkRows } from "@/lib/websiteBenchmarkRows";

export type ReproducibleBenchmarkRow = (typeof benchmarkRows)[number] & {
  scan: null | {
    id: string; public_outcome: string; decision: string; decision_reason: string; artifact_sha256: string;
    scanner_build: string; ruleset_version: string; coverage_percent: number; scanned_at: string; score_schema_version: string;
    severity: string; malware_score: number; risk_score: number;
  };
};

export async function getReproducibleBenchmark(): Promise<{ rows: ReproducibleBenchmarkRow[]; published: number; awaiting: number }> {
  const db = publicDb();
  if (!db) return { rows: benchmarkRows.map((row) => ({ ...row, scan: null })), published: 0, awaiting: benchmarkRows.length };
  const ids = [...new Set(benchmarkRows.map((row) => row.id))];
  const { data } = await db.from("scans").select("id,extension_id,version,artifact_sha256,public_outcome,decision,decision_reason,scanner_build,ruleset_version,coverage_percent,scanned_at,score_schema_version,severity,malware_score,risk_score").eq("scan_purpose", "benchmark").in("extension_id", ids).order("scanned_at", { ascending: false });
  const byArtifact = new Map<string, Record<string, unknown>>();
  for (const scan of (data || []) as Array<Record<string, unknown>>) {
    const key = artifactKey(String(scan.extension_id), String(scan.version), String(scan.artifact_sha256));
    if (!byArtifact.has(key) && Number(scan.coverage_percent) === 100 && String(scan.scanner_build || "") && String(scan.ruleset_version || "")) byArtifact.set(key, scan);
  }
  const rows: ReproducibleBenchmarkRow[] = benchmarkRows.map((row) => {
    const scan = byArtifact.get(artifactKey(row.id, row.version, row.sha256));
    return { ...row, scan: scan ? {
      id: String(scan.id), public_outcome: String(scan.public_outcome || "incomplete"), decision: String(scan.decision || "incomplete"), decision_reason: String(scan.decision_reason || ""), artifact_sha256: String(scan.artifact_sha256),
      scanner_build: String(scan.scanner_build), ruleset_version: String(scan.ruleset_version), coverage_percent: Number(scan.coverage_percent), scanned_at: String(scan.scanned_at), score_schema_version: String(scan.score_schema_version || "1"),
      severity: String(scan.severity || "INFO"), malware_score: Number(scan.malware_score || 0), risk_score: Number(scan.risk_score || 0),
    } : null };
  });
  const published = rows.filter((row) => row.scan).length;
  return { rows, published, awaiting: rows.length - published };
}

export function immutableScanPath(row: ReproducibleBenchmarkRow): string | null {
  return row.scan ? `/extensions/${encodeURIComponent(row.id)}/versions/${encodeURIComponent(row.version)}/scans/${encodeURIComponent(row.scan.id)}` : null;
}

function artifactKey(id: string, version: string, sha256: string) { return `${id.toLowerCase()}@${version}@${sha256.toLowerCase()}`; }
