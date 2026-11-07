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
  relationship_review: {
    declared: number;
    scanned: number;
    required: boolean;
  };
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
      relationship_review: { declared: 0, scanned: 0, required: false },
    };
  }
  const decision = String(scan.decision || "incomplete");
  const relationshipReview = relationshipReviewForScan(scan);
  const requiresRelationshipReview = relationshipReview.required;
  const verdict = decision === "allow" && !requiresRelationshipReview ? "pass" : "fail";
  return {
    extension,
    version,
    verdict,
    decision,
    severity: scan.severity ?? null,
    public_outcome: scan.public_outcome ?? null,
    coverage_percent: Number(scan.coverage_percent || 0),
    reason: requiresRelationshipReview
      ? "The parent release is allowed, but one or more declared related extensions lack completed exact-release evidence. The gate fails until each related release is reviewed."
      : decision === "allow"
      ? "Latest completed public analysis allows this exact release."
      : "Latest completed public analysis requires review or blocks this exact release.",
    report: `/extensions/${encodeURIComponent(extension)}/versions/${encodeURIComponent(version)}/scans/${encodeURIComponent(String(scan.id))}`,
    scan_id: scan.id,
    checked: { extension_id: scan.extension_id, version: scan.version, scanned_at: scan.scanned_at },
    relationship_review: relationshipReview,
  };
}

async function fetchLatestScan(db: SupabaseClient, check: GateCheck): Promise<ScanRow> {
  const { data: rows, error } = await db
    .from("scans")
    .select("id,extension_id,version,decision,severity,public_outcome,coverage_percent,scanned_at,artifact_inventory")
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

function relationshipReviewForScan(scan: Record<string, unknown>) {
  const inventory = objectValue(scan.artifact_inventory);
  const relationships = objectValue(inventory.extension_relationship_inventory);
  const declared = Array.isArray(relationships.entries) ? relationships.entries : [];
  const resolution = Array.isArray(relationships.resolution) ? relationships.resolution : [];
  const scanned = resolution.filter((item) => objectValue(item).status === "scanned").length;
  const required = declared.some((entry) => {
    const relation = objectValue(entry);
    const extensionId = String(relation.extension_id || "").toLowerCase();
    const relationship = String(relation.relationship || "");
    const result = resolution.find((candidate) => {
      const item = objectValue(candidate);
      return String(item.extension_id || "").toLowerCase() === extensionId
        && String(item.relationship || "") === relationship;
    });
    const item = objectValue(result);
    return item.status !== "scanned" || !item.resolved_version || !validSha256(item.resolved_artifact_sha256);
  });
  return { declared: declared.length, scanned, required };
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function validSha256(value: unknown) {
  return typeof value === "string" && /^[a-f0-9]{64}$/i.test(value);
}

/** Shared by the single (`/api/gate`) and bulk (`/api/gate/bulk`) endpoints so the verdict logic never drifts between them. */
export async function lookupGateVerdict(db: SupabaseClient, check: GateCheck, failOnUnreviewed: boolean): Promise<GateResult> {
  const scan = await fetchLatestScan(db, check);
  return formatGateResult(check, scan, failOnUnreviewed);
}
