import type { PrivateDatabase } from "@/lib/cloudflarePrivate";

export async function cleanupAnalytics(db: PrivateDatabase) {
  // Bounded batches prevent a large first purge from exhausting a scheduled invocation.
  const cutoff = new Date(Date.now() - 90 * 86_400_000).toISOString();
  await db.batch([
    db.prepare("DELETE FROM app_analytics_events WHERE id IN (SELECT id FROM app_analytics_events WHERE occurred_at < ? LIMIT 5000)").bind(cutoff),
    db.prepare("DELETE FROM app_analytics_limits WHERE key IN (SELECT key FROM app_analytics_limits WHERE expires_at < ? LIMIT 5000)").bind(new Date().toISOString()),
  ]);
}
