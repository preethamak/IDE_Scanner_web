/** Public trust tier derivation for badges and registry surfaces.
 *
 * Both the SVG badge endpoint and the registry spotlight need the same one-word
 * answer for "what did the last completed analysis of this exact release say?".
 * Keeping it here means the badge and the page can never disagree.
 *
 * Two rules this module must keep, because the terms page commits to them:
 * a release with no completed analysis is never presented as clean, and a clean
 * result is described as "no findings" — never as a safety guarantee.
 */

export type TrustTier =
  | "verified"
  | "analyzed"
  | "attention"
  | "confirmed_risk"
  | "unanalyzed";

export type TrustTierInfo = {
  tier: TrustTier;
  label: string;
  summary: string;
};

/** Structural input so BadgeDecision and PublicInventoryItem both satisfy it.
 * `incomplete` is accepted and reported as unanalyzed: the scanner could not
 * verify enough to decide, which is not the same as a clean result. */
export type TrustTierInput = {
  found?: boolean;
  decision?: "allow" | "review" | "block" | "incomplete" | null;
  analysis_status?: string | null;
  coverage_percent?: number | null;
  severity?: string | null;
};

/** Below this evidence coverage an `allow` is reported as analyzed, not clean. */
export const VERIFIED_COVERAGE_MINIMUM = 80;

const UNANALYZED: TrustTierInfo = {
  tier: "unanalyzed",
  label: "analysis pending",
  summary: "No completed analysis for this release yet.",
};

export function deriveTrustTier(input: TrustTierInput): TrustTierInfo {
  if (input.found === false) return UNANALYZED;
  const status = (input.analysis_status || "").toLowerCase();
  if (status && status !== "complete") return UNANALYZED;

  switch (input.decision) {
    case "block":
      return {
        tier: "confirmed_risk",
        label: "risk confirmed",
        summary: "Analysis confirmed behavior that should block installation.",
      };
    case "review":
      return {
        tier: "attention",
        label: "needs review",
        summary: "Findings need a human decision before this release is used.",
      };
    case "allow": {
      const coverage = input.coverage_percent ?? 0;
      if (coverage >= VERIFIED_COVERAGE_MINIMUM)
        return {
          tier: "verified",
          label: "no findings",
          summary:
            "No findings across the analyzed surface of this exact release.",
        };
      return {
        tier: "analyzed",
        label: "analyzed",
        summary:
          "No findings, but evidence coverage was partial for this release.",
      };
    }
    default:
      return UNANALYZED;
  }
}

/** Badge text for one release. Version is appended so a badge cannot be read
 * as a claim about a newer, unanalyzed release. */
export function trustBadgeText(
  info: TrustTierInfo,
  version?: string | null,
): string {
  const trimmed = (version || "").trim();
  if (!trimmed || info.tier === "unanalyzed") return info.label;
  return `${info.label} ${trimmed}`;
}
