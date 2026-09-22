import { describe, expect, it } from "vitest";
import { catalogFromReleaseReport, hasCompletePublicCoverage, normalizeRuleCatalog } from "@/lib/rules";

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

describe("hasCompletePublicCoverage", () => {
  const completeRuntime = {
    metadata: {
      profile: "deep",
      intelligence_snapshot: {
        dynamic_sandbox: {
          status: "executed",
          execution: "controlled-bubblewrap",
          runtime_policy: "capability-gated-v1",
          executed: true,
          external_syscall_trace_available: true,
          external_syscall_trace: false,
        },
      },
    },
    extensions: [{
      analysis_status: "complete",
      analysis_coverage: {
        status: "complete",
        required_providers_complete: true,
        providers: {
          dynamic_sandbox: {
            required: false,
            status: "not-applicable",
            executed: false,
            policy: "capability-gated-v1",
            external_syscall_trace: false,
          },
        },
      },
    }],
  };

  it("accepts a complete capability-gated runtime decision", () => {
    expect(hasCompletePublicCoverage(completeRuntime)).toBe(true);
  });

  it("rejects an incomplete or static-only public report", () => {
    expect(hasCompletePublicCoverage({ ...completeRuntime, metadata: { profile: "standard" } })).toBe(false);
    expect(hasCompletePublicCoverage({ ...completeRuntime, extensions: [{ ...completeRuntime.extensions[0], analysis_status: "incomplete" }] })).toBe(false);
  });
});
