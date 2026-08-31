import "server-only";

import { serviceDb } from "@/lib/supabase";
import { catalogFromReleaseReport, type ActiveRuleCatalog } from "@/lib/rules";

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

    const scans = await db
      .from("scans")
      .select("id,canonical_report,policy_version,ruleset_version,score_schema_version,scanner_build")
      .in("id", scanIds)
      .eq("analysis_status", "complete")
    if (scans.error || (scans.data || []).length !== scanIds.length) return null;

    const policyVersion = text(release.data.policy_version);
    const rulesetVersion = text(release.data.ruleset_version);
    const scoreSchemaVersion = text(release.data.score_schema_version);
    const scannerBuild = text(release.data.scanner_build);
    if (!policyVersion || !rulesetVersion || !scoreSchemaVersion || !scannerBuild) return null;
    const expected = { policyVersion, rulesetVersion, scoreSchemaVersion, scannerBuild };
    let rules: ActiveRuleCatalog["rules"] | null = null;
    let fingerprint = "";
    for (const scan of scans.data || []) {
      if (
        text(scan.policy_version) !== policyVersion
        || text(scan.ruleset_version) !== rulesetVersion
        || text(scan.score_schema_version) !== scoreSchemaVersion
        || text(scan.scanner_build) !== scannerBuild
      ) return null;
      const candidate = catalogFromReleaseReport(scan.canonical_report, expected);
      if (!candidate) return null;
      const candidateFingerprint = JSON.stringify(candidate);
      if (fingerprint && fingerprint !== candidateFingerprint) return null;
      rules = candidate;
      fingerprint = candidateFingerprint;
    }
    return rules ? { ...expected, rules } : null;
  } catch {
    return null;
  }
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}
