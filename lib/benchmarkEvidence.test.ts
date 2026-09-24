import { describe, expect, it } from "vitest";
import { benchmarkScanIsComplete, selectBenchmarkScansForRelease } from "@/lib/benchmarkEvidence";

const activeRelease = {
  policyVersion: "3.0.0",
  rulesetVersion: "2026.08.21",
  scoreSchemaVersion: "2",
  scannerBuild: "active-build",
  scanIds: ["active-scan"],
};

describe("benchmark publication boundary", () => {
  it("requires canonical completion metadata in addition to 100% scalar coverage", () => {
    const complete = {
      analysis_status: "complete",
      analysis_coverage: { status: "complete", required_providers_complete: true, executable_file_coverage_percent: 100 },
      coverage_percent: 100,
      scanner_build: "active-build",
      policy_version: "3.0.0",
      ruleset_version: "2026.08.21",
    };
    expect(benchmarkScanIsComplete(complete)).toBe(true);
    expect(benchmarkScanIsComplete({ ...complete, analysis_status: "incomplete" })).toBe(false);
    expect(benchmarkScanIsComplete({ ...complete, analysis_coverage: { ...complete.analysis_coverage, required_providers_complete: false } })).toBe(false);
    expect(benchmarkScanIsComplete({ ...complete, policy_version: "legacy" })).toBe(false);
  });

  it("does not let a newer historical scan replace an active-release report", () => {
    const selected = selectBenchmarkScansForRelease([
      {
        id: "historical-scan",
        policy_version: "3.0.0",
        ruleset_version: "2026.07.24",
        score_schema_version: "2",
        scanner_build: "old-build",
        scanned_at: "2026-08-28T12:00:00Z",
      },
      {
        id: "active-scan",
        policy_version: "3.0.0",
        ruleset_version: "2026.08.21",
        score_schema_version: "2",
        scanner_build: "active-build",
        scanned_at: "2026-08-20T12:00:00Z",
      },
    ], activeRelease);

    expect(selected.map((scan) => scan.id)).toEqual(["active-scan"]);
  });

  it("requires explicit release membership even for a matching scan tuple", () => {
    const selected = selectBenchmarkScansForRelease([
      { id: "unpublished-scan", policy_version: "3.0.0", ruleset_version: "2026.08.21", score_schema_version: "2", scanner_build: "active-build" },
      { id: "active-scan", policy_version: "3.0.0", ruleset_version: "2026.08.21", score_schema_version: "2", scanner_build: "active-build" },
    ], activeRelease);

    expect(selected.map((scan) => scan.id)).toEqual(["active-scan"]);
  });
});
