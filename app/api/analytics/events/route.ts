import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { parseCookies, privateDb, userFromSession } from "@/lib/cloudflarePrivate";
import { runtimeEnv } from "@/lib/runtimeEnv";
import { analyticsPath, boundedJson, campaignValue, referrerHost, sameOrigin } from "@/lib/admin/validation";
import { edgeDimensions, insertAnalyticsEvent, telemetryHash } from "@/lib/admin/telemetry";

const accepted = new Set(["page_view", "public_search_submitted", "catalog_result_opened", "public_report_viewed", "workspace_signup_started", "workspace_created", "watch_created", "report_monitor_setup_opened", "report_monitor_completed", "decision_created", "alert_acknowledged", "team_badge_studio_opened", "team_badge_scan_requested", "team_badge_created", "team_badge_copied", "team_badge_report_opened", "team_badge_refresh_intent", "share_copied"]);
const headers = { "Cache-Control": "no-store" };
export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Origin rejected." }, { status: 403, headers });
  if (runtimeEnv("ABSCISSA_ANALYTICS_ENABLED") !== "true") return new Response(null, { status: 204, headers });
  let body;
  try { body = await boundedJson(request, 4096); } catch { return NextResponse.json({ error: "Invalid event." }, { status: 400, headers }); }
  if (body.consent !== "granted" || !accepted.has(String(body.name))) return NextResponse.json({ error: "Invalid event or consent." }, { status: 400, headers });
  const path = analyticsPath(body.path);
  if (path === "/excluded") return new Response(null, { status: 204, headers });
  try {
    const db = privateDb();
    const day = new Date().toISOString().slice(0, 10);
    const ip = request.headers.get("cf-connecting-ip");
    // Cloudflare overwrites this header. Fail closed without it in production;
    // local integration tests can exercise the collector with a configured secret.
    if (!ip && process.env.NODE_ENV === "production") return new Response(null, { status: 204, headers });
    const rateKey = telemetryHash(`rate:${day}:${ip || "local"}`);
    const tomorrow = new Date(Date.now() + 86_400_000).toISOString();
    const admitted = await db.prepare(`INSERT INTO app_analytics_limits(key,hits,expires_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET hits=hits+1 WHERE hits<2000 RETURNING hits`).bind(rateKey, tomorrow).first();
    if (!admitted) return NextResponse.json({ error: "Event limit reached." }, { status: 429, headers });
    const cookies = parseCookies(request.headers.get("cookie") || "");
    const token = /^[a-f0-9-]{36}$/.test(cookies.gr_analytics || "") ? cookies.gr_analytics : randomUUID();
    const ua = request.headers.get("user-agent") || "";
    const user = await userFromSession(request).catch(() => null);
    await insertAnalyticsEvent({
      name: String(body.name), path, session_id: telemetryHash(`session:${token}`), user_id: user?.id,
      referrer: referrerHost(body.referrer), utm_source: campaignValue(body.utm_source), utm_medium: campaignValue(body.utm_medium), utm_campaign: campaignValue(body.utm_campaign),
      device: /ipad|tablet/i.test(ua) ? "tablet" : /mobile|iphone|android/i.test(ua) ? "mobile" : "desktop",
      browser: /edg/i.test(ua) ? "Edge" : /firefox/i.test(ua) ? "Firefox" : /chrome|crios/i.test(ua) ? "Chrome" : /safari/i.test(ua) ? "Safari" : "Other",
      ...edgeDimensions(),
    }, db);
    const response = new NextResponse(null, { status: 204, headers });
    response.cookies.set("gr_analytics", token, { httpOnly: true, secure: new URL(request.url).protocol === "https:", sameSite: "lax", path: "/", maxAge: 1800 });
    return response;
  } catch { return NextResponse.json({ error: "Analytics is temporarily unavailable." }, { status: 503, headers }); }
}
