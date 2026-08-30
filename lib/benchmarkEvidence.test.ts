import { describe, expect, it } from "vitest";
import { selectBenchmarkScansForRelease } from "@/lib/benchmarkEvidence";

const activeRelease = {
  policyVersion: "3.0.0",
  rulesetVersion: "2026.08.21",
  scoreSchemaVersion: "2",
  scannerBuild: "active-build",
  scanIds: ["active-scan"],
};

describe("benchmark publication boundary", () => {
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
