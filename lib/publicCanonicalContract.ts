import { canonicalAnalysisStatus } from "@/lib/classificationContract";
import { publicRuntimeError } from "@/lib/publicRuntimeContract";

type ValueMap = Record<string, unknown>;

/**
 * Shared admission contract for reports that may become public or benchmark
 * intelligence. Keeping this pure lets the Supabase and Cloudflare/D1
 * callback paths enforce exactly the same rules before durable persistence.
 */
export function publicCanonicalError(
  publicPurpose: boolean,
  reportedSchemaVersion: string,
  detail: ValueMap,
  metadata: ValueMap,
  expectedScannerBuild?: string,
  expectedExtensionId?: string,
  expectedVersion?: string,
): string | null {
  if (!publicPurpose) return null;
  if (reportedSchemaVersion !== "2.3") return "Public scans require canonical report schema 2.3.";
  if (String(detail.score_schema_version || "") !== "2") return "Public scans require canonical score schema v2.";
  if (String(metadata.scanner_version || "").includes("hosted-static")) return "Hosted-static reports cannot be published as canonical scans.";
  const identity = objectValue(detail.artifact_identity);
  if (registryIntegrityMismatch(detail, identity) && !isDisclosedMarketplaceIntegrityMismatch(detail, identity)) {
    return "Public scans cannot publish unverified registry artifact integrity metadata.";
  }
  const identityExtensionId = String(identity.extension_id || "").trim();
  const detailExtensionId = String(detail.extension_id || "").trim();
  const identityVersion = String(identity.version || "").trim();
  const detailVersion = String(detail.version || "").trim();
  if (identityExtensionId && detailExtensionId && identityExtensionId.toLowerCase() !== detailExtensionId.toLowerCase()) {
    return "Public scans require matching extension identity fields.";
  }
  if (identityVersion && detailVersion && identityVersion !== detailVersion) {
    return "Public scans require matching extension version fields.";
  }
  const claimedExtensionId = detailExtensionId || identityExtensionId;
  const claimedVersion = detailVersion || identityVersion;
  if (expectedExtensionId && (!claimedExtensionId || claimedExtensionId.toLowerCase() !== expectedExtensionId.toLowerCase())) {
    return "Scanner result does not match the publication extension identity.";
  }
  if (expectedVersion && (!claimedVersion || claimedVersion !== expectedVersion)) {
    return "Scanner result does not match the publication extension version.";
  }
  const identityHash = String(identity.sha256 || "").trim();
  const detailHash = String(detail.artifact_sha256 || "").trim();
  if (!isSha256(identityHash || detailHash)) return "Public scans require canonical artifact SHA-256 identity.";
  if (identityHash && detailHash && identityHash.toLowerCase() !== detailHash.toLowerCase()) {
    return "Public scans require matching artifact SHA-256 identity fields.";
  }
  if (!metadata.policy_version || metadata.policy_version === "legacy") return "Public scans require an explicit non-legacy classification policy.";
  if (!metadata.ruleset_version || metadata.ruleset_version === "unknown") return "Public scans require an explicit ruleset version.";
  const intelligence = objectValue(metadata.intelligence_snapshot);
  const runtimeError = publicRuntimeError(
    metadata,
    objectValue(detail.analysis_coverage),
    String(expectedExtensionId || detailExtensionId || identityExtensionId),
  );
  if (runtimeError) return runtimeError;
  const registryIntelligence = objectValue(intelligence.registry);
  if (!/^[0-9a-f]{64}$/.test(String(registryIntelligence.sha256 || ""))) {
    return "Public scans require immutable registry intelligence identity.";
  }
  const registryPayload = objectValue(registryIntelligence.payload);
  if (!Array.isArray(registryPayload.findings) || !Array.isArray(registryPayload.errors)) {
    return "Public scans require replayable registry intelligence evidence.";
  }
  const advisoryError = extensionAdvisoryError(intelligence, objectValue(detail.analysis_coverage));
  if (advisoryError) return advisoryError;
  const scannerBuild = String(metadata.scanner_build || "");
  if (!expectedScannerBuild) return "Public scans require a job-bound scanner build.";
  if (scannerBuild !== expectedScannerBuild) return "Scanner build does not match the build bound to this job.";
  const status = canonicalAnalysisStatus(detail);
  const decision = String(detail.decision || "incomplete");
  const coverage = objectValue(detail.analysis_coverage);
  if (!detail.analysis_status) return "Public scans require canonical analysis status.";
  if (coverage.status !== status && !(status === "failed" && coverage.status === "incomplete")) {
    return "Canonical analysis status must agree with analysis coverage status.";
  }
  if (typeof coverage.executable_file_coverage_percent !== "number") {
    return "Public scans require explicit executable-file coverage.";
  }
  if (coverage.executable_file_coverage_percent !== 100) {
    return "Public scans require 100% executable-file coverage.";
  }
  if (status === "complete" && coverage.required_providers_complete !== true) {
    return "A complete scan requires every required analyzer to complete.";
  }
  if (status === "complete" && !["allow", "review", "block"].includes(decision)) return "A complete scan requires an allow, review, or block decision.";
  if (status !== "complete" && !["incomplete", "block"].includes(decision)) return "An incomplete or failed scan cannot publish an approval decision.";
  return null;
}

function objectValue(value: unknown): ValueMap {
  return value && typeof value === "object" && !Array.isArray(value) ? value as ValueMap : {};
}

function isSha256(value: string): boolean {
  return /^[0-9a-f]{64}$/i.test(value);
}

function registryIntegrityMismatch(detail: ValueMap, identity: ValueMap): boolean {
  const inventory = objectValue(detail.artifact_inventory);
  const signature = objectValue(identity.signature || inventory.vsix_signature);
  const packageIntegrity = objectValue(signature.package_integrity);
  return identity.registry_integrity_mismatch === true || packageIntegrity.metadata_mismatch === true;
}

/**
 * Some first-party Marketplace releases have stale VsixSha256 metadata even
 * though the exact bytes can be downloaded and preserved. Those scans may be
 * published only when the report carries the complete, disclosed mismatch:
 * the source is the official VS Marketplace, both digests are present, the
 * observed digest is the canonical artifact identity, and the artifact was
 * preserved for later evidence review. This is deliberately narrower than a
 * generic "allow mismatch" switch so user uploads and other registries remain
 * fail-closed.
 */
function isDisclosedMarketplaceIntegrityMismatch(detail: ValueMap, identity: ValueMap): boolean {
  if (identity.registry !== "vs-marketplace" || identity.original_registry_artifact !== true || identity.preserved !== true) return false;
  if (String(identity.artifact_origin || "") !== "vs-marketplace_original") return false;
  if (String(detail.source || "") !== "vs-marketplace") return false;
  const inventory = objectValue(detail.artifact_inventory);
  const signature = objectValue(identity.signature || inventory.vsix_signature);
  const packageIntegrity = objectValue(signature.package_integrity);
  if (packageIntegrity.algorithm !== "sha256" || packageIntegrity.source !== "vs-marketplace-version-property") return false;
  if (packageIntegrity.metadata_mismatch !== true || identity.registry_integrity_mismatch !== true) return false;
  const expected = String(packageIntegrity.expected || "").trim().toLowerCase();
  const actual = String(packageIntegrity.actual || "").trim().toLowerCase();
  const identityHash = String(identity.sha256 || "").trim().toLowerCase();
  const detailHash = String(detail.artifact_sha256 || "").trim().toLowerCase();
  if (!isSha256(expected) || !isSha256(actual) || expected === actual || actual !== identityHash) return false;
  if (detailHash && detailHash !== actual) return false;
  const warnings = Array.isArray(inventory.warnings) ? inventory.warnings : [];
  return warnings.some((warning) => String(warning).toLowerCase().includes("metadata sha-256 did not match"));
}

function extensionAdvisoryError(intelligence: ValueMap, coverage: ValueMap): string | null {
  const snapshot = objectValue(intelligence.extension_advisories);
  const provider = objectValue(objectValue(coverage.providers).extension_advisories);
  const snapshotSha = String(snapshot.sha256 || "").trim();
  const providerSha = String(provider.sha256 || "").trim();
  const snapshotVersion = String(snapshot.snapshot_version || "").trim();
  const providerVersion = String(provider.snapshot_version || "").trim();
  if (snapshot.status !== "completed" || !isSha256(snapshotSha) || !snapshotVersion) {
    return "Public scans require a completed immutable extension-advisory snapshot.";
  }
  if (provider.required !== true || provider.status !== "completed" || providerSha !== snapshotSha || providerVersion !== snapshotVersion) {
    return "Public scans require extension-advisory provider coverage matching the report snapshot.";
  }
  return null;
}
