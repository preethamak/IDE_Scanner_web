import "server-only";
import { createHmac, randomUUID } from "node:crypto";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { privateDb } from "@/lib/cloudflarePrivate";
import { runtimeEnv } from "@/lib/runtimeEnv";
import { boundedNumber } from "./validation";

type Event = {
  name: string; path?: string; session_id?: string; user_id?: string; referrer?: string;
  utm_source?: string; utm_medium?: string; utm_campaign?: string; device?: string; browser?: string;
  country?: string; asn?: string; bot_score?: number; provider?: string; operation?: string; status?: number; duration_ms?: number;
};
export async function insertAnalyticsEvent(event: Event, db = privateDb()) {
  const fields = ["id", "occurred_at", "name", "path", "session_id", "user_id", "referrer", "utm_source", "utm_medium", "utm_campaign", "device", "browser", "country", "asn", "bot_score", "provider", "operation", "status", "duration_ms"];
  await db.prepare(`INSERT INTO app_analytics_events(${fields.join(",")}) VALUES(${fields.map(() => "?").join(",")})`).bind(
    randomUUID(), new Date().toISOString(), event.name, event.path || "", event.session_id || "", event.user_id || null,
    event.referrer || "", event.utm_source || "", event.utm_medium || "", event.utm_campaign || "", event.device || "", event.browser || "",
    event.country || "", event.asn || "", event.bot_score ?? null, event.provider || "", event.operation || "", event.status || 0, boundedNumber(event.duration_ms, 600_000),
  ).run();
}
/** Failures never change login, provider, or MCP responses. No payloads are accepted. */
export async function recordOperationalEvent(event: Pick<Event, "name" | "user_id" | "provider" | "operation" | "status" | "duration_ms">) {
  try {
    const work = insertAnalyticsEvent(event).catch(() => undefined);
    try { getCloudflareContext().ctx.waitUntil(work); } catch { await work; }
  } catch { /* Optional telemetry must not interrupt product operations. */ }
}
export function telemetryHash(value: string): string {
  const secret = runtimeEnv("ANALYTICS_HASH_SECRET");
  if (secret.length < 32) throw new Error("Analytics hashing is not configured.");
  return createHmac("sha256", secret).update(value).digest("hex");
}
export function edgeDimensions() {
  try {
    const cf = (getCloudflareContext() as unknown as { cf?: { country?: string; asn?: number; botManagement?: { score?: number } } }).cf;
    return { country: /^[A-Z]{2}$/.test(cf?.country || "") ? cf!.country : "", asn: cf?.asn ? String(cf.asn) : "", bot_score: typeof cf?.botManagement?.score === "number" ? boundedNumber(cf.botManagement.score, 99) : undefined };
  } catch { return {}; }
}
export async function observedFetch(provider: "marketplace" | "openvsx" | "sarvam", operation: string, input: RequestInfo | URL, init: RequestInit): Promise<Response> {
  const start = Date.now(); let status = 0;
  try { const response = await fetch(input, init); status = response.status; return response; }
  finally { await recordOperationalEvent({ name: provider === "sarvam" ? "llm_request" : "provider_request", provider, operation, status, duration_ms: Date.now() - start }); }
}
