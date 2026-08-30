import { deriveTrustTier, type TrustTier } from "@/lib/trustTiers";

/**
 * Ranking for the MCP `find_reputable_alternatives` tool.
 *
 * Given the public inventory and a free-text query, surface up to five
 * releases from reputable sources: allowed decisions first, then better
 * trust tier, verified publishers, and lower severity. Pure functions so
 * the ordering can be unit tested without a database.
 */

export type AlternativeCandidate = {
  extension_id: string;
  version: string;
  display_name: string;
  publisher: string;
  publisher_verified: boolean;
  description: string;
  decision: string;
  severity: string;
  public_outcome?: string;
  scan_id: string;
  capability_assessment?: Record<string, unknown>;
};

export type RankedAlternative = {
  extension_id: string;
  version: string;
  display_name: string;
  publisher: string;
  publisher_verified: boolean;
  decision: string;
  severity: string;
  trust_tier: TrustTier;
  report_path: string;
};

const SEVERITY_RANK: Record<string, number> = { INFO: 1, LOW: 2, MEDIUM: 3, HIGH: 4, CRITICAL: 5 };

const TIER_RANK: Record<TrustTier, number> = {
  verified: 0,
  analyzed: 1,
  unanalyzed: 2,
  attention: 3,
  confirmed_risk: 4,
};

export function matchesQuery(candidate: AlternativeCandidate, query: string): boolean {
  const tokens = query.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  if (!tokens.length) return false;
  const haystack = [
    candidate.extension_id,
    candidate.display_name,
    candidate.publisher,
    candidate.description,
  ]
    .join(" ")
    .toLowerCase();
  return tokens.some((token) => haystack.includes(token));
}

function candidateTier(candidate: AlternativeCandidate): TrustTier {
  return deriveTrustTier({
    analysis_status: "complete",
    decision: candidate.decision,
    public_outcome: candidate.public_outcome,
    capability_assessment: candidate.capability_assessment,
  }).tier;
}

/** Sort key: allow decision first, then trust tier, verified publisher, lower severity. */
export function compareAlternatives(a: AlternativeCandidate, b: AlternativeCandidate): number {
  const allowDelta = Number(a.decision !== "allow") - Number(b.decision !== "allow");
  if (allowDelta) return allowDelta;
  const tierDelta = TIER_RANK[candidateTier(a)] - TIER_RANK[candidateTier(b)];
  if (tierDelta) return tierDelta;
  const verifiedDelta = Number(!a.publisher_verified) - Number(!b.publisher_verified);
  if (verifiedDelta) return verifiedDelta;
  const severityDelta = (SEVERITY_RANK[a.severity] || 0) - (SEVERITY_RANK[b.severity] || 0);
  if (severityDelta) return severityDelta;
  return a.extension_id.localeCompare(b.extension_id);
}

export function rankAlternatives(
  candidates: AlternativeCandidate[],
  query: string,
  limit = 5,
): RankedAlternative[] {
  const byExtension = new Map<string, AlternativeCandidate>();
  for (const candidate of candidates) {
    if (!matchesQuery(candidate, query)) continue;
    const key = candidate.extension_id.toLowerCase();
    const existing = byExtension.get(key);
    if (!existing || compareAlternatives(candidate, existing) < 0) byExtension.set(key, candidate);
  }
  return [...byExtension.values()]
    .sort(compareAlternatives)
    .slice(0, limit)
    .map((candidate) => ({
      extension_id: candidate.extension_id,
      version: candidate.version,
      display_name: candidate.display_name,
      publisher: candidate.publisher,
      publisher_verified: candidate.publisher_verified,
      decision: candidate.decision,
      severity: candidate.severity,
      trust_tier: candidateTier(candidate),
      report_path: `/extensions/${encodeURIComponent(candidate.extension_id)}/versions/${encodeURIComponent(candidate.version)}/scans/${encodeURIComponent(candidate.scan_id)}`,
    }));
}
