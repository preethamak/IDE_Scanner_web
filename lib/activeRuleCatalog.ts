import "server-only";

import { serviceDb } from "@/lib/supabase";
import { type ActiveRuleCatalog, normalizeRuleCatalog } from "@/lib/rules";

/**
 * Reads the catalog embedded in the active immutable scanner release. The web
 * application never carries a second copy of scanner rules or a ruleset label:
 * publishing a release makes this exact catalog visible to pages and the API.
 */
export async function getActiveRuleCatalog(): Promise<ActiveRuleCatalog | null> {
  try {
    const db = serviceDb();
    const release = await db
      .from("scan_publication_releases")
      .select("id,policy_version,ruleset_version,score_schema_version,scanner_build")
      .eq("active", true)
      .limit(1)
      .maybeSingle();
    if (release.error || !release.data?.id) return null;

    const members = await db
      .from("scan_publication_release_scans")
      .select("scan_id")
      .eq("release_id", release.data.id);
    const scanIds = (members.data || []).map((member) => String(member.scan_id || "")).filter(Boolean);
    if (members.error || scanIds.length === 0) return null;

    const scan = await db
      .from("scans")
      .select("canonical_report")
      .in("id", scanIds)
      .eq("analysis_status", "complete")
      .limit(1)
      .maybeSingle();
    const report = objectValue(scan.data?.canonical_report);
    const rules = normalizeRuleCatalog(objectValue(report.rules).rules);
    if (scan.error || rules.length === 0) return null;

    const policyVersion = text(release.data.policy_version);
    const rulesetVersion = text(release.data.ruleset_version);
    const scoreSchemaVersion = text(release.data.score_schema_version);
    const scannerBuild = text(release.data.scanner_build);
    if (!policyVersion || !rulesetVersion || !scoreSchemaVersion || !scannerBuild) return null;
    return { policyVersion, rulesetVersion, scoreSchemaVersion, scannerBuild, rules };
  } catch {
    return null;
  }
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}
