import { createHash } from "node:crypto";
import { serviceDb } from "@/lib/supabase";
import { benchmarkRows } from "@/lib/websiteBenchmarkRows";

type Bundle = { metadata?: Record<string, unknown>; extensions?: Record<string, Record<string, unknown>> | Array<Record<string, unknown>> };

export async function ingestScanBundle(jobId: string, bundle: Bundle): Promise<string> {
  const db = serviceDb();
  const detail = firstExtension(bundle.extensions);
  if (!detail) throw new Error("Scanner bundle contains no extension detail.");
  const metadata = bundle.metadata || {};
  const scannerBuild = String(metadata.scanner_build || "").trim();
  const identity = object(detail.artifact_identity);
  const coverage = object(detail.analysis_coverage);
  const provenance = object(detail.provenance);
  const capabilityAssessment = object(detail.capability_assessment);
  const extensionId = String(detail.extension_id || identity.extension_id || "");
  const version = String(detail.version || identity.version || "");
  const artifactSha = String(identity.sha256 || detail.artifact_sha256 || "");
  if (!extensionId || !version || !artifactSha) throw new Error("Bundle is missing immutable artifact identity.");
  if (!scannerBuild || scannerBuild === "unknown") throw new Error("Bundle is missing immutable scanner build identity.");
  // Keep the scan callback compatible with the currently deployed database
  // while operational-intelligence migration 011 rolls out. A worker result
  // must never be rejected simply because an optional metrics column has not
  // been deployed yet.
  const queuedJob = await db.from("scan_jobs").select("extension_id,version,scan_purpose").eq("id", jobId).maybeSingle();
  if (queuedJob.error) throw new Error(`Scan job lookup failed: ${queuedJob.error.message}`);
  if (!queuedJob.data) throw new Error("Scan job was not found.");
  if (queuedJob.data.extension_id !== extensionId || queuedJob.data.version !== version) throw new Error("Scanner result does not match the claimed artifact.");
  const publicPurpose = ["public_intelligence", "benchmark"].includes(String(queuedJob.data.scan_purpose));
  if (publicPurpose && String(detail.score_schema_version || "") !== "2") throw new Error("Public scans require canonical score schema v2.");
  if (publicPurpose && String(metadata.scanner_version || "").includes("hosted-static")) throw new Error("Hosted-static reports cannot be published as canonical scans.");
  if (queuedJob.data.scan_purpose === "benchmark") {
    const expected = benchmarkRows.find((row) => row.id.toLowerCase() === extensionId.toLowerCase() && row.version === version);
    if (!expected || expected.sha256.toLowerCase() !== artifactSha.toLowerCase()) throw new Error("Benchmark result does not match the frozen artifact hash.");
  }

  const scanRow = {
    job_id: jobId,
    extension_id: extensionId,
    version,
    artifact_sha256: artifactSha,
    profile: String(metadata.profile || "deep"),
    schema_version: String(metadata.schema_version || "2.2"),
    scanner_version: String(metadata.scanner_version || "unknown"),
    scanner_build: scannerBuild,
    ruleset_version: String(metadata.ruleset_version || "unknown"),
    decision: String(detail.decision || "incomplete"),
    decision_reason: String(detail.decision_reason || detail.verdict_reason || "Review scan evidence."),
    public_outcome: String(detail.public_outcome || legacyOutcome(detail)),
    decision_basis: String(detail.decision_basis || "legacy_scanner_result"),
    evidence_confidence: String(detail.evidence_confidence || "none"),
    provenance_tier: String(provenance.tier || "unknown"),
    expected_profile_id: String(provenance.profile_id || capabilityAssessment.profile_id || "") || null,
    capability_assessment: capabilityAssessment,
    score_schema_version: String(detail.score_schema_version || "1"),
    verdict: String(detail.verdict || "review"),
    severity: String(detail.severity || "INFO"),
    risk_score: Number(detail.risk_score || 0),
    malware_score: Number(detail.malware_score || 0),
    coverage_percent: Number(coverage.coverage_percent || 0),
    analysis_coverage: coverage,
    provider_coverage: object(coverage.providers),
    security_dimensions: object(detail.security_dimensions),
    manifest: object(detail.manifest),
    artifact_inventory: object(detail.artifact_inventory),
    capabilities: object(detail.capabilities),
    baseline_diff: object(detail.baseline_diff),
    canonical_report: compactBundle(bundle),
    scanned_at: String(metadata.created_at || new Date().toISOString()),
  };
  const { data: scan, error } = await db.from("scans").upsert(scanRow, { onConflict: "extension_id,version,artifact_sha256,ruleset_version,scanner_build" }).select("id").single();
  if (error) throw error;
  const scanId = String(scan.id);
  await Promise.all([db.from("findings").delete().eq("scan_id", scanId), db.from("artifact_files").delete().eq("scan_id", scanId), db.from("dependencies").delete().eq("scan_id", scanId), db.from("artifact_file_previews").delete().eq("scan_id", scanId)]);

  const findings = array(detail.findings).map((raw, index) => { const item = object(raw); const baseId = String(item.finding_id || item.rule_id || "finding"); return { id: `${baseId}-${index}`, scan_id: scanId, rule_id: String(item.rule_id || "unknown"), category: String(item.category || "unknown"), severity: String(item.severity || "INFO"), confidence: Number(item.confidence || 0), evidence_class: String(item.evidence_class || "weak"), actionability: String(item.actionability || "contextual"), summary: String(item.evidence_summary || "Scanner evidence"), recommendation: String(item.recommendation || ""), file_refs: array(item.file_refs), evidence: object(item.evidence) } });
  const inventory = object(detail.artifact_inventory);
  const files = array(inventory.files).map((raw) => { const item = object(raw); return { scan_id: scanId, path: String(item.path || ""), sha256: String(item.sha256 || ""), size_bytes: Number(item.size_bytes || 0), kind: String(item.kind || "file"), target: item.target ? String(item.target) : null }; }).filter((item) => item.path && item.sha256);
  const dependencies = array(detail.dependency_inventory).map((raw) => { const item = object(raw); return { scan_id: scanId, name: String(item.name || ""), version: String(item.version || "unknown"), ecosystem: String(item.ecosystem || "npm"), relationship: String(item.relationship || "transitive"), advisories: array(item.advisories) }; }).filter((item) => item.name);
  const hashes = new Map(files.map((file) => [file.path, file.sha256.toLowerCase()]));
  const previews = array(inventory.source_previews).map((raw) => {
    const item = object(raw); const path = String(item.path || ""); const content = String(item.content || ""); const byteLength = Buffer.byteLength(content);
    const recordedHash = String(item.content_sha256 || "").toLowerCase(); const contentHash = createHash("sha256").update(content).digest("hex");
    if (!path || path.includes("\\") || path.split("/").some((part) => !part || part === "." || part === "..") || byteLength > 204800 || !hashes.has(path) || recordedHash !== contentHash) return null;
    return { scan_id: scanId, path, content, content_sha256: contentHash, byte_length: byteLength, truncated: Boolean(item.truncated) };
  }).filter((item): item is { scan_id: string; path: string; content: string; content_sha256: string; byte_length: number; truncated: boolean } => Boolean(item));
  await insertChunks("findings", findings);
  await insertChunks("artifact_files", files);
  await insertChunks("dependencies", dependencies);
  await insertChunks("artifact_file_previews", previews);
  const completedAt = new Date().toISOString();
  if (scanRow.decision !== "incomplete") {
    const supersede = await db.from("scans").update({ superseded_at: completedAt }).eq("extension_id", extensionId).eq("version", version).eq("scan_purpose", queuedJob.data.scan_purpose).neq("id", scanId).is("superseded_at", null);
    if (supersede.error) throw supersede.error;
  }
  const versionUpdate = await db.from("extension_versions").update({ artifact_sha256: artifactSha, latest_scan_id: scanId, scan_state: scanRow.decision === "incomplete" ? "incomplete" : "complete" }).eq("extension_id", extensionId).eq("version", version);
  if (versionUpdate.error) throw versionUpdate.error;
  await Promise.all([
    db.from("scan_jobs").update({ status: scanRow.decision === "incomplete" ? "incomplete" : "complete", lifecycle_stage: "completed", ruleset_version: scanRow.ruleset_version, callback_error: null, completed_at: completedAt, lease_expires_at: null, updated_at: completedAt, last_event_at: completedAt }).eq("id", jobId),
    db.from("scan_runner_status").upsert({ id: "github-actions", last_seen_at: completedAt, last_success_at: completedAt, last_error: null }, { onConflict: "id" }),
    db.from("scan_job_events").insert({ job_id: jobId, stage: "completed", event_type: "report_published", detail: { scan_id: scanId, decision: scanRow.decision } }),
  ]);
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
function legacyOutcome(detail: Record<string, unknown>): string {
  const decision = String(detail.decision || "incomplete");
  if (decision === "allow") return "clear";
  if (decision === "review") return "investigate";
  if (decision === "block") return String(detail.verdict) === "malicious" ? "confirmed_threat" : "preventive_block";
  return "incomplete";
}

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
