import { publicationRuntimeMismatch } from "./publication-runtime.mjs";

/**
 * Recheck the canonical public-report contract immediately before a release
 * manifest is built. Callback ingestion is the first boundary, but release
 * builders must also reject legacy or manually edited rows already present in
 * Supabase/D1.
 */
export function publicCanonicalMismatch({ reportedSchemaVersion, detail, metadata, expectedScannerBuild, expectedExtensionId, expectedVersion }) {
  if (String(reportedSchemaVersion || "") !== "2.3") return "public report schema must be 2.3";
  if (String(detail.score_schema_version || "") !== "2") return "public score schema must be v2";
  if (String(metadata.scanner_version || "").includes("hosted-static")) return "hosted-static reports cannot be published";

  const identity = object(detail.artifact_identity);
  if (registryIntegrityMismatch(detail, identity)) {
    return "public report has unverified registry artifact integrity metadata";
  }
  const identityExtensionId = String(identity.extension_id || "").trim();
  const detailExtensionId = String(detail.extension_id || "").trim();
  const identityVersion = String(identity.version || "").trim();
  const detailVersion = String(detail.version || "").trim();
  if (identityExtensionId && detailExtensionId && identityExtensionId.toLowerCase() !== detailExtensionId.toLowerCase()) {
    return "public report extension identity fields disagree";
  }
  if (identityVersion && detailVersion && identityVersion !== detailVersion) {
    return "public report extension version fields disagree";
  }
  const claimedExtensionId = detailExtensionId || identityExtensionId;
  const claimedVersion = detailVersion || identityVersion;
  if (expectedExtensionId && (!claimedExtensionId || claimedExtensionId.toLowerCase() !== String(expectedExtensionId).toLowerCase())) {
    return "public report extension identity does not match the database row";
  }
  if (expectedVersion && (!claimedVersion || claimedVersion !== String(expectedVersion))) {
    return "public report extension version does not match the database row";
  }
  const identityHash = String(identity.sha256 || "").trim();
  const detailHash = String(detail.artifact_sha256 || "").trim();
  if (!SHA256.test(identityHash || detailHash)) return "public report requires a canonical artifact SHA-256";
  if (identityHash && detailHash && identityHash.toLowerCase() !== detailHash.toLowerCase()) {
    return "public report artifact SHA-256 fields disagree";
  }
  if (!metadata.policy_version || metadata.policy_version === "legacy") return "public report requires a non-legacy policy";
  if (!metadata.ruleset_version || metadata.ruleset_version === "unknown") return "public report requires an explicit ruleset";

  const runtimeMismatch = publicationRuntimeMismatch({
    profile: metadata.profile,
    metadata,
    analysisCoverage: object(detail.analysis_coverage),
  });
  if (runtimeMismatch) return runtimeMismatch;

  const intelligence = object(metadata.intelligence_snapshot);
  const advisoryMismatch = extensionAdvisoryMismatch(intelligence, object(detail.analysis_coverage));
  if (advisoryMismatch) return advisoryMismatch;
  const registry = object(intelligence.registry);
  if (!SHA256.test(String(registry.sha256 || ""))) return "public report requires immutable registry intelligence identity";
  const payload = object(registry.payload);
  if (!Array.isArray(payload.findings) || !Array.isArray(payload.errors)) {
    return "public report requires replayable registry intelligence evidence";
  }

  const scannerBuild = String(metadata.scanner_build || "");
  if (!expectedScannerBuild) return "public report requires a job-bound scanner build";
  if (scannerBuild !== expectedScannerBuild) return "public report scanner build does not match the release build";

  const status = canonicalAnalysisStatus(detail);
  const coverage = object(detail.analysis_coverage);
  const decision = String(detail.decision || "incomplete");
  if (!detail.analysis_status) return "public report requires canonical analysis status";
  if (coverage.status !== status && !(status === "failed" && coverage.status === "incomplete")) {
    return "public report analysis status disagrees with coverage status";
  }
  if (typeof coverage.executable_file_coverage_percent !== "number") return "public report requires executable-file coverage";
  if (coverage.executable_file_coverage_percent !== 100) return "public report requires 100% executable-file coverage";
  if (status === "complete" && coverage.required_providers_complete !== true) return "complete public report lacks required provider completion";
  if (status === "complete" && !PUBLIC_DECISIONS.has(decision)) return "complete public report has no valid publication decision";
  if (status !== "complete" && !["incomplete", "block"].includes(decision)) return "incomplete public report has an approval decision";
  return null;
}

/**
 * Verify that the database row and canonical JSON report describe the same
 * immutable scan. Release builders must not publish a row whose scalar
 * columns disagree with its report, even if both values look valid alone.
 */
export function publicationRowMismatch({ row, detail }) {
  const database = object(row);
  const report = object(detail);
  const identity = object(report.artifact_identity);
  if (registryIntegrityMismatch(report, identity)) {
    return "canonical report has unverified registry artifact integrity metadata";
  }
  const reportHash = String(identity.sha256 || report.artifact_sha256 || "").trim().toLowerCase();
  const databaseHash = String(database.artifact_sha256 || "").trim().toLowerCase();
  if (databaseHash !== reportHash) return "database artifact SHA-256 does not match the canonical report";

  for (const field of ["extension_id", "version", "decision", "severity"]) {
    if (database[field] !== undefined && String(database[field] || "") !== String(report[field] || "")) {
      return `database ${field} does not match the canonical report`;
    }
  }

  if (database.analysis_status !== undefined) {
    if (String(database.analysis_status || "") !== canonicalAnalysisStatus(report)) {
      return "database analysis_status does not match the canonical report";
    }
  }

  if (database.coverage_percent !== undefined) {
    const coverage = object(report.analysis_coverage);
    const reportCoverage = coverage.coverage_percent ?? coverage.executable_file_coverage_percent;
    if (typeof reportCoverage !== "number" || Number(database.coverage_percent) !== reportCoverage) {
      return "database coverage_percent does not match the canonical report";
    }
  }

  if (database.analysis_coverage !== undefined) {
    const databaseCoverage = object(database.analysis_coverage);
    const reportCoverage = object(report.analysis_coverage);
    for (const field of ["status", "required_providers_complete"]) {
      if (databaseCoverage[field] !== undefined && databaseCoverage[field] !== reportCoverage[field]) {
        return `database analysis_coverage.${field} does not match the canonical report`;
      }
    }
    const databaseDynamic = object(object(databaseCoverage.providers).dynamic_sandbox);
    const reportDynamic = object(object(reportCoverage.providers).dynamic_sandbox);
    for (const field of ["required", "status", "execution", "policy", "executed", "external_syscall_trace"]) {
      if (databaseDynamic[field] !== undefined && databaseDynamic[field] !== reportDynamic[field]) {
        return `database dynamic_sandbox.${field} does not match the canonical report`;
      }
    }
  }
  return null;
}

/**
 * Revalidate a report while exporting the public registry. The active release
 * is the attested identity boundary; every exported row must still match it
 * after the release was activated.
 */
export function activeRegistryRowMismatch({ row, detail, metadata, release }) {
  const database = object(row);
  const report = object(detail);
  const rowMismatch = publicationRowMismatch({ row: database, detail: report });
  if (rowMismatch) return `registry row does not match the canonical report: ${rowMismatch}`;
  const identity = object(report.artifact_identity);
  if (registryIntegrityMismatch(report, identity)) {
    return "registry report has unverified registry artifact integrity metadata";
  }
  const active = object(release);
  const identityExtensionId = String(identity.extension_id || "");
  const detailExtensionId = String(report.extension_id || "");
  const identityVersion = String(identity.version || "");
  const detailVersion = String(report.version || "");
  if (identityExtensionId && detailExtensionId
    && identityExtensionId.toLowerCase() !== detailExtensionId.toLowerCase()) {
    return "registry report extension identity fields disagree";
  }
  if (identityVersion && detailVersion && identityVersion !== detailVersion) {
    return "registry report version fields disagree";
  }
  const reportHash = String(identity.sha256 || report.artifact_sha256 || "").trim().toLowerCase();
  const detailHash = String(report.artifact_sha256 || "").trim().toLowerCase();
  if (identity.sha256 && detailHash && String(identity.sha256).toLowerCase() !== detailHash) {
    return "registry report artifact SHA-256 fields disagree";
  }
  if (!SHA256.test(reportHash)) return "registry report requires a canonical artifact SHA-256";
  if (String(database.artifact_sha256 || "").trim().toLowerCase() !== reportHash) {
    return "registry row artifact SHA-256 does not match the canonical report";
  }
  for (const field of ["extension_id", "version"]) {
    const databaseValue = String(database[field] || "");
    const reportValue = String(report[field] || "");
    if ((field === "extension_id" ? databaseValue.toLowerCase() : databaseValue)
      !== (field === "extension_id" ? reportValue.toLowerCase() : reportValue)) {
      return `registry row ${field} does not match the canonical report`;
    }
    const identityValue = field === "extension_id" ? identityExtensionId : identityVersion;
    if (identityValue
      && (field === "extension_id"
        ? identityValue.toLowerCase() !== databaseValue.toLowerCase()
        : identityValue !== databaseValue)) {
      return `registry row ${field} does not match the artifact identity`;
    }
  }
  if (String(metadata.schema_version || "") !== "2.3") return "registry report schema is not 2.3";
  for (const field of ["scanner_build", "policy_version", "ruleset_version"]) {
    if (String(metadata[field] || "") !== String(active[field] || "")) {
      return `registry report ${field} does not match the active release`;
    }
  }
  if (String(report.score_schema_version || "") !== String(active.score_schema_version || "")) {
    return "registry report score schema does not match the active release";
  }
  const coverage = object(report.analysis_coverage);
  const runtimeMismatch = publicationRuntimeMismatch({
    profile: metadata.profile,
    metadata,
    analysisCoverage: coverage,
  });
  if (runtimeMismatch) return runtimeMismatch;
  const advisoryMismatch = extensionAdvisoryMismatch(object(metadata.intelligence_snapshot), coverage);
  if (advisoryMismatch) return advisoryMismatch;
  if (String(report.analysis_status || "") !== "complete"
    || coverage.status !== "complete"
    || coverage.required_providers_complete !== true
    || coverage.executable_file_coverage_percent !== 100) {
    return "registry report does not have complete 100% executable coverage";
  }
  if (!PUBLIC_DECISIONS.has(String(report.decision || ""))) {
    return "registry report has no valid publication decision";
  }
  return null;
}

export function singleExtensionDetail(value) {
  const entries = Array.isArray(value)
    ? value.filter((item) => item && typeof item === "object" && !Array.isArray(item))
    : Object.values(object(value)).filter((item) => item && typeof item === "object" && !Array.isArray(item));
  return entries.length === 1 ? entries[0] : {};
}

const SHA256 = /^[0-9a-f]{64}$/i;
const PUBLIC_DECISIONS = new Set(["allow", "review", "block"]);

function canonicalAnalysisStatus(detail) {
  const raw = String(detail.analysis_status || object(detail.analysis_coverage).status || "incomplete");
  return raw === "complete" || raw === "failed" ? raw : "incomplete";
}

function object(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function registryIntegrityMismatch(detail, identity) {
  const inventory = object(detail.artifact_inventory);
  const signature = object(identity.signature || inventory.vsix_signature);
  const packageIntegrity = object(signature.package_integrity);
  return identity.registry_integrity_mismatch === true
    || packageIntegrity.metadata_mismatch === true;
}

function extensionAdvisoryMismatch(intelligence, coverage) {
  const snapshot = object(intelligence.extension_advisories);
  const provider = object(object(coverage.providers).extension_advisories);
  const snapshotSha = String(snapshot.sha256 || "").trim();
  const providerSha = String(provider.sha256 || "").trim();
  const snapshotVersion = String(snapshot.snapshot_version || "").trim();
  const providerVersion = String(provider.snapshot_version || "").trim();
  if (snapshot.status !== "completed" || !SHA256.test(snapshotSha) || !snapshotVersion) {
    return "public report requires a completed immutable extension-advisory snapshot";
  }
  if (provider.required !== true || provider.status !== "completed" || providerSha !== snapshotSha || providerVersion !== snapshotVersion) {
    return "public report extension-advisory provider coverage does not match the report snapshot";
  }
  return null;
}
