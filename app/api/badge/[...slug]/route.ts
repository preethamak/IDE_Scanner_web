import { getVersionBadgeDecision } from "@/lib/productData";
import { deriveTrustTier, trustBadgeText } from "@/lib/trustTiers";
import { badgeTierColors, renderBadgeSvg } from "@/lib/badgeSvg";

export const dynamic = "force-dynamic";

// Version-pinned seal URL: /api/badge/{ecosystem}/{package}/{version}
// The badge for an analyzed version never changes content; a new release
// earns a new URL only after its own analysis completes.

export async function GET(_request: Request, context: { params: Promise<{ slug?: string[] }> }) {
  const { slug = [] } = await context.params;
  const [ecosystem, rawPackage, rawVersion] = slug.map((part) => decodeURIComponent(part || "").trim());

  if (ecosystem !== "vscode" || !rawPackage || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_.-]+$/.test(rawPackage)) {
    return renderBadgeSvg("analysis pending", badgeTierColors.unanalyzed, "unsupported badge path");
  }

  let decision;
  try {
    decision = await getVersionBadgeDecision(rawPackage, rawVersion || "");
  } catch {
    return renderBadgeSvg("analysis pending", badgeTierColors.unanalyzed, "unavailable");
  }
  if (!decision.found || !decision.decision) {
    return renderBadgeSvg("analysis pending", badgeTierColors.unanalyzed, "not analyzed");
  }
  const info = deriveTrustTier(decision);
  return renderBadgeSvg(trustBadgeText(info, decision.version, decision.risk_score), badgeTierColors[info.tier] || badgeTierColors.analyzed, info.label);
}
