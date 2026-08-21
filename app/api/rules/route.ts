import { NextResponse } from "next/server";
import { RULESET_VERSION, ruleCatalog } from "@/lib/metrics";
import { serviceDb } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type BridgeRulesResult = {
  ruleset_version: string;
  rules: unknown[];
  source: "active-publication" | "static-fallback";
};

let cache: { at: number; data: BridgeRulesResult } | null = null;
const CACHE_MS = 5 * 60 * 1000;

export async function GET() {
  if (cache && Date.now() - cache.at < CACHE_MS) {
    return NextResponse.json(cache.data);
  }

  try {
    const db = serviceDb();
    const release = await db
      .from("scan_publication_releases")
      .select("policy_version,ruleset_version,scanner_build")
      .eq("active", true)
      .limit(1)
      .maybeSingle();
    if (release.error) throw release.error;
    if (!release.data) throw new Error("No active scan publication exists.");

    const scan = await db
      .from("scans")
      .select("canonical_report")
      .eq("policy_version", release.data.policy_version)
      .eq("ruleset_version", release.data.ruleset_version)
      .eq("scanner_build", release.data.scanner_build)
      .eq("analysis_status", "complete")
      .is("superseded_at", null)
      .limit(1)
      .maybeSingle();
    if (scan.error) throw scan.error;

    const report = objectValue(scan.data?.canonical_report);
    const catalog = objectValue(report.rules);
    if (!Array.isArray(catalog.rules) || catalog.rules.length === 0) {
      throw new Error("The active publication does not contain a rule catalog.");
    }

    const data: BridgeRulesResult = {
      ruleset_version: String(release.data.ruleset_version),
      rules: catalog.rules,
      source: "active-publication",
    };
    cache = { at: Date.now(), data };
    return NextResponse.json(data);
  } catch {
    const data: BridgeRulesResult = {
      ruleset_version: RULESET_VERSION,
      rules: ruleCatalog.map((rule) => ({
        rule_id: rule.id,
        title: rule.title,
        category: rule.category,
        evidence_class: rule.evidence,
        default_severity: rule.severity,
        engine: rule.engine,
        description: rule.description,
        recommendation: "Review the cited artifact evidence and apply the rule-specific remediation.",
      })),
      source: "static-fallback",
    };
    return NextResponse.json(data);
  }
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}
