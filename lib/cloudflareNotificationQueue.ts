import { nowIso, type PrivateDatabase } from "@/lib/cloudflarePrivate";
import {
  cloudflareNotificationProvider,
  cloudflareNotificationRequest,
} from "@/lib/cloudflareNotificationDelivery";

/** Deliver due D1-backed workspace notifications from either cron entrypoint. */
export async function deliverCloudflareNotifications(
  db: PrivateDatabase,
  now = nowIso(),
) {
  const pending = await db
    .prepare("SELECT id,kind,target,payload_json,attempts FROM app_notification_deliveries WHERE status IN ('pending','failed') AND next_attempt_at<=? ORDER BY created_at LIMIT 50")
    .bind(now)
    .all<Record<string, unknown>>();
  let sent = 0;
  let failed = 0;
  for (const row of pending.results) {
    const attempts = Number(row.attempts || 0) + 1;
    try {
      const payload = JSON.parse(String(row.payload_json || "{}"));
      const provider = cloudflareNotificationProvider(
        String(row.kind || "generic_webhook"),
        String(row.target),
        payload,
      );
      const delivery = cloudflareNotificationRequest(provider, String(row.target), payload);
      const response = await fetch(delivery.destination, {
        method: "POST",
        redirect: "error",
        headers: { "Content-Type": "application/json", "User-Agent": "GuardRails-Notification-Delivery/1.0", ...delivery.headers },
        body: JSON.stringify(delivery.payload),
        signal: AbortSignal.timeout(12_000),
      });
      if (!response.ok) throw new Error(`Notification endpoint returned ${response.status}`);
      await db.prepare("UPDATE app_notification_deliveries SET status='sent',attempts=?,delivered_at=?,last_error=NULL WHERE id=?")
        .bind(attempts, nowIso(), String(row.id)).run();
      sent += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Notification delivery failed.";
      const retryAt = new Date(Date.now() + Math.min(60, 2 ** Math.min(attempts, 5)) * 60_000).toISOString();
      await db.prepare("UPDATE app_notification_deliveries SET status='failed',attempts=?,last_error=?,next_attempt_at=? WHERE id=?")
        .bind(attempts, message.slice(0, 1000), retryAt, String(row.id)).run();
      failed += 1;
    }
  }
  return { attempted: pending.results.length, sent, failed };
}
