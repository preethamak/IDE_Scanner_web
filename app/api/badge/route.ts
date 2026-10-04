import { getBadgeDecision, getVersionBadgeDecision } from "@/lib/productData";
import { renderPendingBadgeSvg, renderTrustBadgeSvg } from "@/lib/badgeSvg";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const extension = (url.searchParams.get("extension") || "").trim();
  const version = (url.searchParams.get("version") || "").trim() || null;
  if (!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_.-]+$/.test(extension)) {
    return renderPendingBadgeSvg("not analyzed");
  }
  let decision;
  try {
    decision = version ? await getVersionBadgeDecision(extension, version) : await getBadgeDecision(extension);
  } catch {
    return renderPendingBadgeSvg("unavailable");
  }
  if (!decision.found || !decision.decision) {
    return renderPendingBadgeSvg(decision.extension_id ? "no completed analysis" : "not analyzed");
  }
  return renderTrustBadgeSvg(decision);
}
