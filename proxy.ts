import { NextResponse, type NextRequest } from "next/server";
import { refreshSession } from "@/lib/supabaseProxy";

const canonicalHost = (() => {
  try {
    return process.env.NEXT_PUBLIC_SITE_URL ? new URL(process.env.NEXT_PUBLIC_SITE_URL).host : "";
  } catch {
    return "";
  }
})();

// Extension detail/version pages can fan out to external marketplace APIs.
// Keep known AI/search crawlers away from that expensive path until the
// marketplace fetches have a bounded cache and quota guard of their own.
const blockedMarketplaceCrawler = /(?:amazon[- ]?searchbot|amazonbot|bytespider|gptbot|oai-searchbot|chatgpt-user|claudebot|perplexitybot|google-extended|ccbot|semrushbot|ahrefsbot|mj12bot|dotbot|petalbot)/i;

export async function proxy(request: NextRequest) {
  const userAgent = request.headers.get("user-agent") || "";
  if (request.nextUrl.pathname.startsWith("/extensions/") && blockedMarketplaceCrawler.test(userAgent)) {
    return new NextResponse("Automated marketplace access is temporarily unavailable.", {
      status: 429,
      headers: {
        "Cache-Control": "no-store",
        "Retry-After": "3600",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  }

  // Auth cookies (PKCE verifier included) are per-host, so every alias must
  // funnel to the canonical host before a sign-in flow starts. Cloudflare
  // Workers preview URLs are intentionally allowed so a candidate version can
  // be audited before it is promoted to the canonical domain.
  const host = request.headers.get("host") || "";
  const hostName = host.split(":", 1)[0].toLowerCase();
  const isCloudflarePreview = hostName.endsWith(".workers.dev");
  const isProduction = !process.env.VERCEL_ENV || process.env.VERCEL_ENV === "production";
  if (isProduction && canonicalHost && host && host !== canonicalHost && !host.startsWith("localhost") && !host.startsWith("127.0.0.1") && !isCloudflarePreview) {
    const url = request.nextUrl.clone();
    url.host = canonicalHost;
    url.protocol = "https:";
    url.port = "";
    return NextResponse.redirect(url, 308);
  }
  return refreshSession(request);
}
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|\\.well-known/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"] };
