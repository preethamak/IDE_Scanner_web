import { getBadgeDecision, type BadgeDecision } from "@/lib/productData";

export const dynamic = "force-dynamic";

const LABELS: Record<string, string> = {
  allow: "analyzed · no known concern",
  review: "review needed",
  block: "do not install",
};

const COLORS: Record<string, [string, string]> = {
  allow: ["#1c7c46", "#2fa96c"],
  review: ["#a06a08", "#d99a1f"],
  block: ["#b32232", "#e04a58"],
  none: ["#4b5763", "#6b7783"],
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const extension = (url.searchParams.get("extension") || "").trim();
  if (!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_.-]+$/.test(extension)) return svg("invalid extension", COLORS.none[1]);
  let decision: BadgeDecision;
  try {
    decision = await getBadgeDecision(extension);
  } catch {
    return svg("unavailable", COLORS.none[1]);
  }
  if (!decision.found) return svg("not analyzed", COLORS.none[1]);
  const key = decision.decision || "none";
  const label = LABELS[key] || "pending analysis";
  return svg(`${label}${decision.version ? ` · v${decision.version}` : ""}`, COLORS[key][1]);
}

function svg(label: string, fill: string) {
  const font = 'font-family="Verdana,Geneva,sans-serif" font-size="11" font-weight="600"';
  const leftWidth = 86;
  const rightWidth = Math.min(Math.max(7 + label.length * 6.2, 40), 300);
  const width = leftWidth + rightWidth;
  const body = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="20" role="img" aria-label="guardrails: ${label}">
<linearGradient id="s" x2="0" y2="100%"><stop offset="0" stop-color="#bbb" stop-opacity=".1"/><stop offset="1" stop-opacity=".1"/></linearGradient>
<clipPath id="r"><rect width="${width}" height="20" rx="3" fill="#fff"/></clipPath>
<g clip-path="url(#r)">
<rect width="${leftWidth}" height="20" fill="#17212c"/>
<rect x="${leftWidth}" width="${rightWidth}" height="20" fill="${fill}"/>
<rect width="${width}" height="20" fill="url(#s)"/>
</g>
<g fill="#fff" text-anchor="middle" ${font}>
<text x="${leftWidth / 2}" y="14" fill="#fff">guardrails</text>
<text x="${leftWidth + rightWidth / 2}" y="14" fill="#101820">${escapeXml(label)}</text>
</g>
</svg>`;
  return new Response(body, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=900, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}

function escapeXml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}
