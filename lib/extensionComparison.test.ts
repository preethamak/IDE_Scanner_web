import { describe, expect, it } from "vitest";
import { compareScanEvidence, evidenceAttribution, summarizeScan } from "@/lib/extensionComparison";

describe("immutable scan comparison", () => {
  const baseline = {
    scan: { decision: "allow", severity: "LOW", coverage_percent: 100, artifact_sha256: "a".repeat(64), scanner_build: "build-1", ruleset_version: "rules-1", capabilities: { network: true } },
    findings: [{ rule_id: "old-rule", severity: "LOW", summary: "Old finding" }],
    files: [{ path: "extension.js", sha256: "old", size_bytes: 10, kind: "file" }],
    dependencies: [{ name: "left-pad", version: "1.0.0", relationship: "runtime", advisories: [] }],
  };

  it("reports added and removed evidence against exact scan ids", () => {
    const target = {
      scan: { decision: "review", severity: "HIGH", coverage_percent: 100, artifact_sha256: "b".repeat(64), scanner_build: "build-1", ruleset_version: "rules-1", capabilities: { network: true, shell: true } },
      findings: [{ rule_id: "new-rule", severity: "HIGH", summary: "New finding" }],
      files: [{ path: "extension.js", sha256: "new", size_bytes: 11, kind: "file" }, { path: "new.js", sha256: "added", size_bytes: 4, kind: "file" }],
      dependencies: [{ name: "axios", version: "1.0.0", relationship: "runtime", advisories: [{ id: "CVE" }] }],
    };
    const changes = compareScanEvidence(baseline, target);
    expect(changes.outcome.decision).toEqual({ from: "allow", to: "review", changed: true });
    expect(changes.capabilities.added).toEqual(["shell"]);
    expect(changes.findings.added).toEqual([expect.objectContaining({ rule_id: "new-rule" })]);
    expect(changes.findings.removed).toEqual([expect.objectContaining({ rule_id: "old-rule" })]);
    expect(changes.dependencies.added).toEqual([expect.objectContaining({ name: "axios", advisory_count: 1 })]);
    expect(changes.files.changed).toEqual([expect.objectContaining({ path: "extension.js", sha256: "new" })]);
  });

  it("withholds release attribution when scanner provenance differs", () => {
    const target = { ...baseline, scan: { ...baseline.scan, scanner_build: "build-2" } };
    expect(evidenceAttribution(baseline, target)).toMatchObject({ artifact_changes: true, evidence_changes: false, same_scanner_build: false });
    expect(summarizeScan("2.0.0", baseline)).toMatchObject({ version: "2.0.0", capabilities: 1, findings: 1 });
  });

  it.each([undefined, null, "", "   ", "unknown", " UNKNOWN ", "unavailable", "none", "n/a", "null", "undefined"])("never treats missing scanner provenance (%s) as a shared baseline", (missing) => {
    const unknown = { ...baseline, scan: { ...baseline.scan, scanner_build: missing, ruleset_version: missing } };
    expect(evidenceAttribution(unknown, unknown)).toMatchObject({ provenance_known: false, evidence_changes: false, same_scanner_build: false, same_ruleset: false });
    expect(evidenceAttribution(unknown, unknown).note).toContain("provenance is missing");
  });

  it("keeps unscanned evidence unavailable rather than displaying zero findings", () => {
    expect(summarizeScan("1.0.0", { scan: null, findings: [], files: [], dependencies: [] })).toMatchObject({ findings: null, files: null, dependencies: null, capabilities: null });
  });

  it("reports the full changed-file count when response rows are bounded", () => {
    const files = Array.from({ length: 205 }, (_, index) => ({ path: `file-${index}.js`, sha256: "old" }));
    const left = { ...baseline, files };
    const right = { ...baseline, files: files.map((file) => ({ ...file, sha256: "new" })) };
    const changes = compareScanEvidence(left, right);
    expect(changes.files.changed).toHaveLength(200);
    expect(changes.files.total_changed).toBe(205);
    expect(changes.files.total_added).toBe(0);
  });
});
