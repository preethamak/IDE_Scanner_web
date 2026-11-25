import type { PrivateDatabase } from "@/lib/cloudflarePrivate";

export async function cleanupAnalytics(db: PrivateDatabase) {
  // Bounded batches prevent a large first purge from exhausting a scheduled invocation.
  const cutoff = new Date(Date.now() - 90 * 86_400_000).toISOString();
  await db.batch([
    db.prepare("DELETE FROM app_analytics_events WHERE id IN (SELECT id FROM app_analytics_events WHERE occurred_at < ? LIMIT 5000)").bind(cutoff),
    db.prepare("DELETE FROM app_llm_usage WHERE id IN (SELECT id FROM app_llm_usage WHERE occurred_at < ? LIMIT 5000)").bind(cutoff),
    db.prepare("DELETE FROM app_api_key_usage WHERE rowid IN (SELECT rowid FROM app_api_key_usage WHERE day < ? LIMIT 5000)").bind(cutoff.slice(0,10)),
    db.prepare("DELETE FROM app_admin_sso_tickets WHERE token_hash IN (SELECT token_hash FROM app_admin_sso_tickets WHERE expires_at < ? LIMIT 5000)").bind(new Date().toISOString()),
    db.prepare("DELETE FROM app_analytics_limits WHERE key IN (SELECT key FROM app_analytics_limits WHERE expires_at < ? LIMIT 5000)").bind(new Date().toISOString()),
  ]);
}
