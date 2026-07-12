import { serviceDb } from "@/lib/supabase";

type Bundle = { metadata?: Record<string, unknown>; extensions?: Record<string, Record<string, unknown>> | Array<Record<string, unknown>> };

export async function ingestScanBundle(jobId: string, bundle: Bundle): Promise<string> {
  const db = serviceDb();
  const detail = firstExtension(bundle.extensions);
  if (!detail) throw new Error("Scanner bundle contains no extension detail.");
  const metadata = bundle.metadata || {};
  const identity = object(detail.artifact_identity);
  const coverage = object(detail.analysis_coverage);
  const extensionId = String(detail.extension_id || identity.extension_id || "");
  const version = String(detail.version || identity.version || "");
  const artifactSha = String(identity.sha256 || detail.artifact_sha256 || "");
  if (!extensionId || !version || !artifactSha) throw new Error("Bundle is missing immutable artifact identity.");

  const scanRow = {
    job_id: jobId,
    extension_id: extensionId,
    version,
    artifact_sha256: artifactSha,
    profile: String(metadata.profile || "deep"),
    schema_version: String(metadata.schema_version || "2.2"),
    scanner_version: String(metadata.scanner_version || "unknown"),
    ruleset_version: String(metadata.ruleset_version || "unknown"),
    decision: String(detail.decision || "incomplete"),
    decision_reason: String(detail.decision_reason || detail.verdict_reason || "Review scan evidence."),
    verdict: String(detail.verdict || "review"),
    severity: String(detail.severity || "INFO"),
    risk_score: Number(detail.risk_score || 0),
    malware_score: Number(detail.malware_score || 0),
    coverage_percent: Number(coverage.coverage_percent || 0),
    provider_coverage: object(coverage.providers),
    security_dimensions: object(detail.security_dimensions),
    manifest: object(detail.manifest),
    artifact_inventory: object(detail.artifact_inventory),
    capabilities: object(detail.capabilities),
    baseline_diff: object(detail.baseline_diff),
    canonical_report: compactBundle(bundle),
    scanned_at: String(metadata.created_at || new Date().toISOString()),
  };
  const { data: scan, error } = await db.from("scans").upsert(scanRow, { onConflict: "extension_id,version,artifact_sha256,ruleset_version" }).select("id").single();
  if (error) throw error;
  const scanId = String(scan.id);
  await Promise.all([db.from("findings").delete().eq("scan_id", scanId), db.from("artifact_files").delete().eq("scan_id", scanId), db.from("dependencies").delete().eq("scan_id", scanId)]);

  const findings = array(detail.findings).map((raw, index) => { const item = object(raw); return { id: String(item.finding_id || `${item.rule_id || "finding"}-${index}`), scan_id: scanId, rule_id: String(item.rule_id || "unknown"), category: String(item.category || "unknown"), severity: String(item.severity || "INFO"), confidence: Number(item.confidence || 0), evidence_class: String(item.evidence_class || "weak"), actionability: String(item.actionability || "contextual"), summary: String(item.evidence_summary || "Scanner evidence"), recommendation: String(item.recommendation || ""), file_refs: array(item.file_refs), evidence: object(item.evidence) } });
  const inventory = object(detail.artifact_inventory);
  const files = array(inventory.files).map((raw) => { const item = object(raw); return { scan_id: scanId, path: String(item.path || ""), sha256: String(item.sha256 || ""), size_bytes: Number(item.size_bytes || 0), kind: String(item.kind || "file"), target: item.target ? String(item.target) : null }; }).filter((item) => item.path && item.sha256);
  const dependencies = array(detail.dependency_inventory).map((raw) => { const item = object(raw); return { scan_id: scanId, name: String(item.name || ""), version: String(item.version || "unknown"), ecosystem: String(item.ecosystem || "npm"), relationship: String(item.relationship || "transitive"), advisories: array(item.advisories) }; }).filter((item) => item.name);
  await insertChunks("findings", findings);
  await insertChunks("artifact_files", files);
  await insertChunks("dependencies", dependencies);
  await db.from("extension_versions").update({ artifact_sha256: artifactSha, latest_scan_id: scanId, scan_state: scanRow.decision === "incomplete" ? "incomplete" : "complete" }).eq("extension_id", extensionId).eq("version", version);
  await db.from("scan_jobs").update({ status: scanRow.decision === "incomplete" ? "incomplete" : "complete", ruleset_version: scanRow.ruleset_version, completed_at: new Date().toISOString() }).eq("id", jobId);
  return scanId;

  async function insertChunks(table: string, rows: Array<Record<string, unknown>>) {
    for (let index = 0; index < rows.length; index += 500) {
      const result = await db.from(table).insert(rows.slice(index, index + 500));
      if (result.error) throw result.error;
    }
  }
}

function firstExtension(value: Bundle["extensions"]): Record<string, unknown> | null {
  if (Array.isArray(value)) return value.find((item) => item && typeof item === "object") || null;
  if (value && typeof value === "object") return Object.values(value).find((item) => item && typeof item === "object") || null;
  return null;
}
function object(value: unknown): Record<string, unknown> { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function array(value: unknown): unknown[] { return Array.isArray(value) ? value : []; }

function compactBundle(bundle: Bundle): Bundle {
  const extensions = bundle.extensions;
  if (Array.isArray(extensions)) return { ...bundle, extensions: extensions.map(compactDetail) };
  if (extensions && typeof extensions === "object") return { ...bundle, extensions: Object.fromEntries(Object.entries(extensions).map(([key, detail]) => [key, compactDetail(detail)])) };
  return bundle;
}
function compactDetail(detail: Record<string, unknown>): Record<string, unknown> {
  const inventory = object(detail.artifact_inventory);
  return { ...detail, artifact_inventory: { ...inventory, files: undefined } };
}
