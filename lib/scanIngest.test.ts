import { describe, expect, it } from "vitest";
import { canonicalAnalysisStatus, incompleteArtifactReason, publicCanonicalError } from "@/lib/scanIngest";

describe("scan ingestion boundaries", () => {
  it("preserves canonical analysis status and fails unknown states closed", () => {
    expect(canonicalAnalysisStatus({ analysis_status: "complete" })).toBe("complete");
    expect(canonicalAnalysisStatus({ analysis_status: "failed" })).toBe("failed");
    expect(canonicalAnalysisStatus({ analysis_coverage: { status: "pending" } })).toBe("incomplete");
  });

  it("keeps artifact acquisition failures explicit without inventing identity", () => {
    const reason = incompleteArtifactReason({ extensions: { "extensions/publisher.large@unknown.json": {
      source: "marketplace-error",
      decision: "incomplete",
      artifact_identity: {},
      artifact_inventory: { skipped_reason: "VSIX download exceeded the configured byte cap; aborted." },
    } } });
    expect(reason).toContain("exceeded the configured byte cap");
  });

  it("does not intercept a report with immutable artifact identity", () => {
    const reason = incompleteArtifactReason({ extensions: [{
      decision: "incomplete",
      artifact_identity: { sha256: "a".repeat(64) },
      artifact_inventory: { skipped_reason: "One analyzer timed out." },
    }] });
    expect(reason).toBeNull();
  });
});

describe("public canonical schema enforcement", () => {
  const goodDetail = { score_schema_version: "2" };
  const goodMeta = { scanner_version: "engine-1" };

  it("admits a canonical 2.2 / score v2 public bundle", () => {
    expect(publicCanonicalError(true, "2.2", goodDetail, goodMeta)).toBeNull();
  });

  it("rejects a public bundle whose report schema is not 2.2", () => {
    expect(publicCanonicalError(true, "2.1", goodDetail, goodMeta)).toContain("report schema 2.2");
    expect(publicCanonicalError(true, "", goodDetail, goodMeta)).toContain("report schema 2.2");
  });

  it("rejects a public bundle whose score schema is not v2", () => {
    expect(publicCanonicalError(true, "2.2", { score_schema_version: "1" }, goodMeta)).toContain("score schema v2");
  });

  it("rejects a hosted-static report published as canonical", () => {
    expect(publicCanonicalError(true, "2.2", goodDetail, { scanner_version: "hosted-static-1" })).toContain("Hosted-static");
  });

  it("does not gate non-public scans on the canonical schema", () => {
    expect(publicCanonicalError(false, "0.1.0", { score_schema_version: "1" }, { scanner_version: "hosted-static-1" })).toBeNull();
  });

  it("enforces independent status and decision for Policy v3", () => {
    const meta = { scanner_version: "engine-1", policy_version: "3.0.0" };
    expect(publicCanonicalError(true, "2.2", { score_schema_version: "2", analysis_status: "complete", decision: "allow" }, meta)).toBeNull();
    expect(publicCanonicalError(true, "2.2", { score_schema_version: "2", decision: "allow" }, meta)).toContain("analysis status");
    expect(publicCanonicalError(true, "2.2", { score_schema_version: "2", analysis_status: "failed", decision: "allow" }, meta)).toContain("cannot publish");
  });
});
