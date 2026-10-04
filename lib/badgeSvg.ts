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
  const height = 28;
  const leftWidth = 118;
  const rightWidth = Math.min(Math.max(30 + label.length * 6.3, 82), 320);
  const width = leftWidth + rightWidth;
  const safeFill = escapeXml(fill);
  const statusText = badgeTextColor(fill);
  const safeLabel = escapeXml(label);
  const safeAriaLabel = escapeXml(ariaLabel);
  const body = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">
<title id="title">GuardRails: ${safeAriaLabel}</title>
<desc id="desc">${safeLabel}</desc>
<defs>
<linearGradient id="guardrails-bg" x2="0" y2="1"><stop stop-color="#243b4d"/><stop offset="1" stop-color="#132330"/></linearGradient>
<linearGradient id="guardrails-status" x2="0" y2="1"><stop stop-color="${safeFill}"/><stop offset="1" stop-color="${safeFill}" stop-opacity=".88"/></linearGradient>
<clipPath id="guardrails-clip"><rect width="${width}" height="${height}" rx="7"/></clipPath>
</defs>
<rect x=".5" y=".5" width="${width - 1}" height="${height - 1}" rx="7" fill="#f5f8fa" stroke="#d7e0e7"/>
<g clip-path="url(#guardrails-clip)">
<rect width="${leftWidth}" height="${height}" fill="url(#guardrails-bg)"/>
<rect x="${leftWidth}" width="${rightWidth}" height="${height}" fill="url(#guardrails-status)"/>
<path d="M${leftWidth} 5v18" stroke="#ffffff" stroke-opacity=".18"/>
</g>
<circle cx="18" cy="14" r="8" fill="#8de1bb" fill-opacity=".18"/>
<path d="M18 7.5l4.8 2v3.8c0 3-2 5.3-4.8 6.7-2.8-1.4-4.8-3.7-4.8-6.7V9.5l4.8-2z" fill="#a8f2d1"/>
<path d="M15.7 13.5l1.5 1.5 3.3-3.5" fill="none" stroke="#173025" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
<g font-family="Arial,Helvetica,sans-serif" font-weight="700">
<text x="33" y="17.2" fill="#ffffff" font-size="10" letter-spacing=".7">GUARDRAILS</text>
<text x="${leftWidth + rightWidth / 2}" y="17.2" fill="${statusText}" font-size="10.5" text-anchor="middle">${safeLabel}</text>
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

function badgeTextColor(fill: string): string {
  const value = fill.replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(value)) return "#102018";
  const channels = [0, 2, 4].map((index) => Number.parseInt(value.slice(index, index + 2), 16) / 255);
  const luminance = channels.map((channel) => channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  const relativeLuminance = 0.2126 * luminance[0] + 0.7152 * luminance[1] + 0.0722 * luminance[2];
  return relativeLuminance > 0.42 ? "#102018" : "#ffffff";
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
