import type { SupabaseClient } from "@supabase/supabase-js";

export type GateCheck = { extension: string; version: string };

export type GateResult = {
  extension: string;
  version: string;
  verdict: "pass" | "fail" | "unreviewed";
  decision: string | null;
  severity: unknown;
  public_outcome: unknown;
  coverage_percent: number;
  reason: string;
  report: string | null;
  scan_id: unknown;
  checked: Record<string, unknown>;
};

type ScanRow = Record<string, unknown> | null | undefined;

const EXTENSION_PATTERN = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_.-]+$/;
const VERSION_PATTERN = /^[\w.+-]{1,64}$/;

export function isValidGateCheck(check: GateCheck): boolean {
  return EXTENSION_PATTERN.test(check.extension) && VERSION_PATTERN.test(check.version);
}

/** Pure result shaping, kept separate from the DB fetch so it can be unit tested directly. */
export function formatGateResult(check: GateCheck, scan: ScanRow, failOnUnreviewed: boolean): GateResult {
  const { extension, version } = check;
  if (!scan) {
    return {
      extension,
      version,
      verdict: failOnUnreviewed ? "fail" : "unreviewed",
      decision: null,
      severity: null,
      public_outcome: null,
      coverage_percent: 0,
      reason: "No completed public analysis exists for this exact release. This is not an approval.",
      report: null,
      scan_id: null,
      checked: { extension, version },
    };
  }
  const decision = String(scan.decision || "incomplete");
  const verdict = decision === "allow" ? "pass" : "fail";
  return {
    extension,
    version,
    verdict,
    decision,
    severity: scan.severity ?? null,
    public_outcome: scan.public_outcome ?? null,
    coverage_percent: Number(scan.coverage_percent || 0),
    reason: decision === "allow"
      ? "Latest completed public analysis allows this exact release."
      : "Latest completed public analysis requires review or blocks this exact release.",
    report: `/extensions/${encodeURIComponent(extension)}/versions/${encodeURIComponent(version)}/scans/${encodeURIComponent(String(scan.id))}`,
    scan_id: scan.id,
    checked: { extension_id: scan.extension_id, version: scan.version, scanned_at: scan.scanned_at },
  };
}

async function fetchLatestScan(db: SupabaseClient, check: GateCheck): Promise<ScanRow> {
  const { data: rows, error } = await db
    .from("scans")
    .select("id,extension_id,version,decision,severity,public_outcome,coverage_percent,scanned_at")
    .eq("extension_id", check.extension)
    .eq("version", check.version)
    .in("scan_purpose", ["public_intelligence", "benchmark"])
    .eq("analysis_status", "complete")
    .is("superseded_at", null)
    .order("scanned_at", { ascending: false })
    .limit(1);
  if (error) throw new Error("Gate lookup failed.");
  return (rows || [])[0] as ScanRow;
}

/** Shared by the single (`/api/gate`) and bulk (`/api/gate/bulk`) endpoints so the verdict logic never drifts between them. */
export async function lookupGateVerdict(db: SupabaseClient, check: GateCheck, failOnUnreviewed: boolean): Promise<GateResult> {
  const scan = await fetchLatestScan(db, check);
  return formatGateResult(check, scan, failOnUnreviewed);
}
