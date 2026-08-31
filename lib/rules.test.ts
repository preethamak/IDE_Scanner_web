import { describe, expect, it } from "vitest";
import { normalizeRuleCatalog } from "@/lib/rules";

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
