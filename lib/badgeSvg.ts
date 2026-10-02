import { deriveTrustTier, trustBadgeText, type TrustTierInput } from "@/lib/trustTiers";

export const badgeTierColors: Record<string, string> = {
  verified: "#2fa96c",
  analyzed: "#31708f",
  attention: "#d99a1f",
  confirmed_risk: "#b32232",
  unanalyzed: "#6b7783",
};

export function renderTrustBadgeSvg(
  scan: TrustTierInput & { version?: unknown; risk_score?: unknown },
) {
  const info = deriveTrustTier(scan);
  return renderBadgeSvg(
    trustBadgeText(info, stringOrNull(scan.version), numberOrNull(scan.risk_score)),
    badgeTierColors[info.tier] || badgeTierColors.analyzed,
    `${info.label} (${stringOrNull(scan.version) || "latest"})`,
  );
}

export function renderBadgeSvg(label: string, fill: string, ariaLabel: string) {
  const font = 'font-family="Arial,Helvetica,sans-serif" font-size="11" font-weight="700"';
  const leftWidth = 104;
  const rightWidth = Math.min(Math.max(20 + label.length * 6.5, 58), 300);
  const width = leftWidth + rightWidth;
  const body = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="24" role="img" aria-label="GuardRails: ${escapeXml(ariaLabel)}">
<linearGradient id="g" x2="0" y2="1"><stop stop-color="#1f2d3d"/><stop offset="1" stop-color="#101923"/></linearGradient>
<clipPath id="r"><rect width="${width}" height="24" rx="6" fill="#fff"/></clipPath>
<g clip-path="url(#r)">
<rect width="${leftWidth}" height="24" fill="url(#g)"/>
<rect x="${leftWidth}" width="${rightWidth}" height="24" fill="${escapeXml(fill)}"/>
<path d="M12 4l6 2.5v4.8c0 3.8-2.5 6.6-6 8.3-3.5-1.7-6-4.5-6-8.3V6.5L12 4z" fill="#8de1bb"/>
<path d="M9.2 11.6l1.8 1.8 4-4" fill="none" stroke="#10251b" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
</g>
<g fill="#fff" text-anchor="middle" ${font}>
<text x="62" y="15.5" fill="#fff">GUARDRAILS</text>
<text x="${leftWidth + rightWidth / 2}" y="15.5" fill="#102018">${escapeXml(label)}</text>
</g>
</svg>`;
  return new Response(body, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      // Publication and revocation are workspace controls. Keep the public
      // asset cacheable, but bound the stale window so a revoked token does
      // not remain embedded for an hour at an edge cache.
      "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
    },
  });
}

export function renderPendingBadgeSvg(reason = "not analyzed") {
  return renderBadgeSvg("analysis pending", badgeTierColors.unanalyzed, reason);
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function numberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}
