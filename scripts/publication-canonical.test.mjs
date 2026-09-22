import { describe, expect, it } from "vitest";
import { activeRegistryRowMismatch, publicCanonicalMismatch, publicationRowMismatch } from "./publication-canonical.mjs";

const build = "a".repeat(40);
const artifact = "d".repeat(64);

function validReport() {
  return {
    metadata: {
      schema_version: "2.3",
      profile: "deep",
      scanner_version: "engine-1",
      scanner_build: build,
      policy_version: "3.0.0",
      ruleset_version: "rules-1",
      intelligence_snapshot: {
        dynamic_sandbox: {
          status: "executed",
          execution: "controlled-bubblewrap",
          runtime_policy: "capability-gated-v1",
          executed: true,
          external_syscall_trace: false,
          external_syscall_trace_available: true,
        },
        registry: {
          sha256: "c".repeat(64),
          payload: { findings: [], errors: [] },
        },
      },
    },
    detail: {
      score_schema_version: "2",
      analysis_status: "complete",
      decision: "allow",
      extension_id: "publisher.extension",
      version: "1.0.0",
      artifact_identity: { extension_id: "publisher.extension", version: "1.0.0", sha256: artifact },
      analysis_coverage: {
        status: "complete",
        executable_file_coverage_percent: 100,
        required_providers_complete: true,
        providers: {
          dynamic_sandbox: {
            required: false,
            status: "not-applicable",
            execution: "policy-gated",
            policy: "capability-gated-v1",
            executed: false,
            external_syscall_trace: false,
          },
        },
      },
    },
  };
}

function mismatch(report = validReport()) {
  return publicCanonicalMismatch({
    reportedSchemaVersion: report.metadata.schema_version,
    detail: report.detail,
    metadata: report.metadata,
    expectedScannerBuild: build,
    expectedExtensionId: "publisher.extension",
    expectedVersion: "1.0.0",
  });
}

describe("publication canonical contract", () => {
  it("accepts a complete capability-gated public report", () => {
    expect(mismatch()).toBeNull();
  });

  it.each([
    ["report schema", (report) => { report.metadata.schema_version = "2.2"; }, "schema must be 2.3"],
    ["score schema", (report) => { report.detail.score_schema_version = "1"; }, "score schema must be v2"],
    ["artifact identity disagreement", (report) => { report.detail.artifact_sha256 = "e".repeat(64); }, "artifact SHA-256 fields disagree"],
    ["unverified registry artifact", (report) => { report.detail.artifact_identity.registry_integrity_mismatch = true; }, "unverified registry artifact integrity"],
    ["registry replay evidence", (report) => { report.metadata.intelligence_snapshot.registry.payload = {}; }, "replayable registry intelligence evidence"],
    ["analysis coverage", (report) => { report.detail.analysis_coverage.executable_file_coverage_percent = undefined; }, "executable-file coverage"],
    ["partial executable coverage", (report) => { report.detail.analysis_coverage.executable_file_coverage_percent = 99; }, "100% executable-file coverage"],
    ["approval on incomplete analysis", (report) => { report.detail.analysis_status = "incomplete"; report.detail.analysis_coverage.status = "incomplete"; report.detail.decision = "review"; }, "incomplete public report has an approval decision"],
    ["database identity binding", (report) => { report.detail.extension_id = "other.extension"; report.detail.artifact_identity.extension_id = "other.extension"; }, "extension identity does not match the database row"],
  ])("rejects %s", (_, mutate, message) => {
    const report = validReport();
    mutate(report);
    expect(mismatch(report)).toContain(message);
  });
});

describe("publication database-row binding", () => {
  it.each([
    ["artifact hash", { artifact_sha256: "e".repeat(64) }, "database artifact SHA-256"],
    ["decision", { artifact_sha256: artifact, decision: "block" }, "database decision"],
    ["analysis status", { artifact_sha256: artifact, analysis_status: "incomplete" }, "database analysis_status"],
    ["coverage", { artifact_sha256: artifact, coverage_percent: 99 }, "database coverage_percent"],
    ["provider coverage", { artifact_sha256: artifact, analysis_coverage: { status: "incomplete" } }, "database analysis_coverage.status"],
  ])("rejects a database %s drift", (_, row, message) => {
    expect(publicationRowMismatch({ row, detail: validReport().detail })).toContain(message);
  });

  it("accepts a row whose scalar fields match the canonical report", () => {
    expect(publicationRowMismatch({
      row: {
        artifact_sha256: artifact,
        extension_id: "publisher.extension",
        version: "1.0.0",
        decision: "allow",
        coverage_percent: 100,
      },
      detail: validReport().detail,
    })).toBeNull();
  });
});

describe("active registry release binding", () => {
  const release = {
    scanner_build: build,
    policy_version: "3.0.0",
    ruleset_version: "rules-1",
    score_schema_version: "2",
  };

  function validRegistryRow() {
    const report = validReport();
    return {
      row: { extension_id: "publisher.extension", version: "1.0.0", artifact_sha256: artifact },
      detail: report.detail,
      metadata: report.metadata,
    };
  }

  it.each([
    ["scanner build", { scanner_build: "b".repeat(40) }, "registry report scanner_build"],
    ["policy", { policy_version: "old-policy" }, "registry report policy_version"],
    ["ruleset", { ruleset_version: "old-rules" }, "registry report ruleset_version"],
    ["coverage", { executable_file_coverage_percent: 99 }, "100% executable coverage"],
    ["runtime coverage", { profile: "standard" }, "deep runtime-enabled profile"],
    ["artifact identity", { artifact_identity: { extension_id: "other.extension", version: "1.0.0", sha256: artifact } }, "identity fields disagree"],
    ["unverified registry artifact", { artifact_identity: { extension_id: "publisher.extension", version: "1.0.0", sha256: artifact, registry_integrity_mismatch: true } }, "unverified registry artifact integrity"],
  ])("rejects active release %s drift", (_, mutation, message) => {
    const value = validRegistryRow();
    if ("executable_file_coverage_percent" in mutation) {
      value.detail.analysis_coverage.executable_file_coverage_percent = mutation.executable_file_coverage_percent;
    } else if ("artifact_identity" in mutation) {
      value.detail.artifact_identity = mutation.artifact_identity;
    } else {
      Object.assign(value.metadata, mutation);
    }
    expect(activeRegistryRowMismatch({ ...value, release })).toContain(message);
  });

  it("accepts a report bound to the active release", () => {
    expect(activeRegistryRowMismatch({ ...validRegistryRow(), release })).toBeNull();
  });
});
