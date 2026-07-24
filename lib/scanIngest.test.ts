import { describe, expect, it } from "vitest";
import { canonicalAnalysisStatus, coveragePresentation, requiresReview } from "@/lib/classificationContract";
import { incompleteArtifactReason, publicCanonicalError, singleExtension } from "@/lib/scanIngest";

describe("scan ingestion boundaries", () => {
  it("requires exactly one extension detail per exact-artifact job", () => {
    expect(singleExtension([{ extension_id: "one" }])?.extension_id).toBe("one");
    expect(singleExtension([])).toBeNull();
    expect(singleExtension([{ extension_id: "one" }, { extension_id: "two" }])).toBeNull();
    expect(singleExtension({ one: { extension_id: "one" }, two: { extension_id: "two" } })).toBeNull();
  });

  it("preserves canonical analysis status and fails unknown states closed", () => {
    expect(canonicalAnalysisStatus({ analysis_status: "complete" })).toBe("complete");
    expect(canonicalAnalysisStatus({ analysis_status: "failed" })).toBe("failed");
    expect(canonicalAnalysisStatus({ analysis_coverage: { status: "pending" } })).toBe("incomplete");
  });

  it("does not label file coverage as analyzer completion", () => {
    expect(coveragePresentation({
      analysis_status: "incomplete",
      coverage_percent: 100,
      analysis_coverage: {
        executable_file_coverage_percent: 100,
        required_providers: ["semgrep"],
        completed_required_providers: [],
        required_providers_complete: false,
      },
    })).toEqual({
      label: "Executable-file coverage",
      percent: 100,
      providerDetail: "Required analysis did not complete",
    });
  });

  it("does not promote low notes to review evidence", () => {
    expect(requiresReview("low")).toBe(false);
    expect(requiresReview("review")).toBe(true);
    expect(requiresReview("block")).toBe(true);
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
  const build = "a".repeat(40);
  const goodDetail = {
    score_schema_version: "2",
    analysis_status: "complete",
    decision: "allow",
    analysis_coverage: {
      status: "complete",
      executable_file_coverage_percent: 100,
      required_providers_complete: true,
    },
  };
  const goodMeta = {
    scanner_version: "engine-1",
    scanner_build: build,
    ruleset_version: "rules-1",
    policy_version: "3.0.0",
    intelligence_snapshot: {
      registry: {
        sha256: "c".repeat(64),
        payload: { enabled: true, mode: "batched", findings: [], errors: [] },
      },
    },
  };

  it("admits a canonical 2.3 / score v2 public bundle", () => {
    expect(publicCanonicalError(true, "2.3", goodDetail, goodMeta, build)).toBeNull();
  });

  it("rejects a public bundle whose report schema is not 2.3", () => {
    expect(publicCanonicalError(true, "2.2", goodDetail, goodMeta, build)).toContain("report schema 2.3");
    expect(publicCanonicalError(true, "", goodDetail, goodMeta, build)).toContain("report schema 2.3");
  });

  it("rejects a public bundle whose score schema is not v2", () => {
    expect(publicCanonicalError(true, "2.3", { ...goodDetail, score_schema_version: "1" }, goodMeta, build)).toContain("score schema v2");
  });

  it("rejects a hosted-static report published as canonical", () => {
    expect(publicCanonicalError(true, "2.3", goodDetail, { ...goodMeta, scanner_version: "hosted-static-1" }, build)).toContain("Hosted-static");
  });

  it("does not gate non-public scans on the canonical schema", () => {
    expect(publicCanonicalError(false, "0.1.0", { score_schema_version: "1" }, { scanner_version: "hosted-static-1" })).toBeNull();
  });

  it("enforces independent status and decision for Policy v3", () => {
    expect(publicCanonicalError(true, "2.3", goodDetail, goodMeta, build)).toBeNull();
    expect(publicCanonicalError(true, "2.3", { score_schema_version: "2", decision: "allow" }, goodMeta, build)).toContain("analysis status");
    expect(publicCanonicalError(true, "2.3", {
      ...goodDetail,
      analysis_status: "failed",
      decision: "allow",
      analysis_coverage: { ...goodDetail.analysis_coverage, status: "incomplete", required_providers_complete: false },
    }, goodMeta, build)).toContain("cannot publish");
  });

  it("rejects missing policy identity and self-asserted scanner builds", () => {
    expect(publicCanonicalError(true, "2.3", goodDetail, { ...goodMeta, policy_version: undefined }, build)).toContain("classification policy");
    expect(publicCanonicalError(true, "2.3", goodDetail, goodMeta, "b".repeat(40))).toContain("bound to this job");
  });

  it("rejects missing registry intelligence identity", () => {
    expect(publicCanonicalError(
      true,
      "2.3",
      goodDetail,
      { ...goodMeta, intelligence_snapshot: {} },
      build,
    )).toContain("registry intelligence identity");
  });

  it("rejects a digest without replayable registry evidence", () => {
    expect(publicCanonicalError(
      true,
      "2.3",
      goodDetail,
      {
        ...goodMeta,
        intelligence_snapshot: { registry: { sha256: "c".repeat(64) } },
      },
      build,
    )).toContain("replayable registry intelligence evidence");
  });
});
