import { describe, expect, it } from "vitest";
import { catalogFromReleaseReport, normalizeRuleCatalog } from "@/lib/rules";

describe("normalizeRuleCatalog", () => {
  it("keeps only valid scanner-owned rules and normalizes their public fields", () => {
    expect(normalizeRuleCatalog([
      { rule_id: "z-rule", title: "Z rule", category: "code", evidence_class: "weak", default_severity: "LOW", engine: "yara", description: "A scanner-owned rule." },
      { rule_id: "a-rule", title: "A rule", recommendation: "Review it." },
      { rule_id: "missing-title" },
      null,
    ])).toEqual([
      { id: "a-rule", title: "A rule", category: "uncategorized", evidence: "unknown", severity: "INFO", engine: "unknown", description: "", recommendation: "Review it.", decisionEffect: "", confidenceBasis: "", falsePositiveNotes: "" },
      { id: "z-rule", title: "Z rule", category: "code", evidence: "weak", severity: "LOW", engine: "yara", description: "A scanner-owned rule.", recommendation: "", decisionEffect: "", confidenceBasis: "", falsePositiveNotes: "" },
    ]);
  });
});

describe("catalogFromReleaseReport", () => {
  const identity = { policyVersion: "policy-1", rulesetVersion: "rules-1" };
  const report = {
    rules: {
      policy_version: "policy-1",
      ruleset_version: "rules-1",
      rules: [{ rule_id: "rule-1", title: "Rule one" }],
    },
  };

  it("accepts only an embedded catalog that identifies the active release", () => {
    expect(catalogFromReleaseReport(report, identity)).toHaveLength(1);
    expect(catalogFromReleaseReport({ ...report, rules: { ...report.rules, policy_version: "policy-2" } }, identity)).toBeNull();
    expect(catalogFromReleaseReport({ ...report, rules: { ...report.rules, ruleset_version: "rules-2" } }, identity)).toBeNull();
    expect(catalogFromReleaseReport({ rules: { policy_version: "policy-1", ruleset_version: "rules-1", rules: [] } }, identity)).toBeNull();
  });
});
