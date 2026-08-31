import { NextResponse } from "next/server";
import { getActiveRuleCatalog } from "@/lib/activeRuleCatalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type BridgeRulesResult = {
  policy_version: string | null;
  ruleset_version: string;
  score_schema_version: string | null;
  scanner_build: string | null;
  rules: unknown[];
  source: "active-publication" | "unavailable";
};

export async function GET() {
  const catalog = await getActiveRuleCatalog();
  if (catalog) {
    const data: BridgeRulesResult = {
      policy_version: catalog.policyVersion,
      ruleset_version: catalog.rulesetVersion,
      score_schema_version: catalog.scoreSchemaVersion,
      scanner_build: catalog.scannerBuild,
      rules: catalog.rules.map((rule) => ({
        rule_id: rule.id,
        title: rule.title,
        category: rule.category,
        evidence_class: rule.evidence,
        default_severity: rule.severity,
        engine: rule.engine,
        description: rule.description,
        recommendation: rule.recommendation,
        decision_effect: rule.decisionEffect,
        confidence_basis: rule.confidenceBasis,
        false_positive_notes: rule.falsePositiveNotes,
      })),
      source: "active-publication",
    };
    return NextResponse.json(data);
  }
  return NextResponse.json({
    policy_version: null,
    ruleset_version: "",
    score_schema_version: null,
    scanner_build: null,
    rules: [],
    source: "unavailable",
  } satisfies BridgeRulesResult, { status: 503 });
}
