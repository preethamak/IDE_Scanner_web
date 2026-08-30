import { NextResponse, type NextRequest } from "next/server";
import { refreshSession } from "@/lib/supabaseProxy";

const canonicalHost = (() => {
  try {
    return process.env.NEXT_PUBLIC_SITE_URL ? new URL(process.env.NEXT_PUBLIC_SITE_URL).host : "";
  } catch {
    return "";
  }
})();

export async function proxy(request: NextRequest) {
  // Auth cookies (PKCE verifier included) are per-host, so every alias must
  // funnel to the canonical host before a sign-in flow starts.
  const host = request.headers.get("host") || "";
  const isProduction = !process.env.VERCEL_ENV || process.env.VERCEL_ENV === "production";
  if (isProduction && canonicalHost && host && host !== canonicalHost && !host.startsWith("localhost") && !host.startsWith("127.0.0.1")) {
    const url = request.nextUrl.clone();
    url.host = canonicalHost;
    url.protocol = "https:";
    url.port = "";
    return NextResponse.redirect(url, 308);
  }
  return refreshSession(request);
}
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|\\.well-known/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"] };
