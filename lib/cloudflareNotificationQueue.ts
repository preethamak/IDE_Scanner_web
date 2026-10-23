import type { PrivateDatabase } from "@/lib/cloudflarePrivate";

export const MAX_NOTIFICATION_DELIVERY_ATTEMPTS = 6;

export function notificationRetryAt(attempts: number, now = Date.now()): string {
  const delayMinutes = Math.min(60, 2 ** Math.min(attempts, 5));
  return new Date(now + delayMinutes * 60_000).toISOString();
}

/** Deliver due D1-backed workspace notifications from either cron entrypoint. */
export async function deliverCloudflareNotifications(
  db: PrivateDatabase,
  now = new Date().toISOString(),
) {
  const pending = await db
    .prepare("SELECT id,kind,target,payload_json,attempts FROM app_notification_deliveries WHERE status IN ('pending','failed') AND next_attempt_at<=? ORDER BY created_at LIMIT 50")
    .bind(now)
    .all<Record<string, unknown>>();
  let sent = 0;
  let failed = 0;
  let deadLettered = 0;
  for (const row of pending.results) {
    const attempts = Number(row.attempts || 0) + 1;
    try {
      const payload = JSON.parse(String(row.payload_json || "{}"));
      const target = String(row.target);
      const kind = String(row.kind || "generic_webhook");
      const delivery = workerSafeDelivery(kind, target, payload);
      const response = await fetch(delivery.destination, {
        method: "POST",
        redirect: "manual",
        headers: { "Content-Type": "application/json", "User-Agent": "GuardRails-Notification-Delivery/1.0", ...delivery.headers },
        body: JSON.stringify(delivery.payload),
        signal: AbortSignal.timeout(12_000),
      });
      if (!response.ok) throw new Error(`Notification endpoint returned ${response.status}`);
      await db.prepare("UPDATE app_notification_deliveries SET status='sent',attempts=?,delivered_at=?,last_error=NULL WHERE id=?")
        .bind(attempts, new Date().toISOString(), String(row.id)).run();
      sent += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Notification delivery failed.";
      const status = attempts >= MAX_NOTIFICATION_DELIVERY_ATTEMPTS ? "dead_letter" : "failed";
      await db.prepare("UPDATE app_notification_deliveries SET status=?,attempts=?,last_error=?,next_attempt_at=? WHERE id=?")
        .bind(status, attempts, message.slice(0, 1000), notificationRetryAt(attempts), String(row.id)).run();
      failed += 1;
      if (status === "dead_letter") deadLettered += 1;
    }
  }
  return { attempted: pending.results.length, sent, failed, dead_lettered: deadLettered };
}

function workerSafeDelivery(kind: string, target: string, payload: unknown) {
  const input = payload && typeof payload === "object" && !Array.isArray(payload)
    ? payload as Record<string, unknown> : {};
  const isSlack = /^https:\/\/hooks\.slack\.com\/services\/[A-Z0-9]+\/[A-Z0-9]+\/[A-Za-z0-9]+$/.test(target);
  const isHttps = (() => { try { return new URL(target).protocol === "https:"; } catch { return false; } })();
  if (kind === "slack_webhook" || isSlack) {
    if (!isSlack) throw new Error("The stored Slack target is no longer allowed.");
    return { destination: target, payload: input.text ? input : { text: `${String(input.extension_id || "extension")}@${String(input.target_version || input.version || "new release")}: ${String(input.message || input.summary || "A watched extension release changed.")}` }, headers: { "X-GuardRails-Event": String(input.event || "monitoring_alert") } };
  }
  if (kind !== "generic_webhook" || !isHttps) throw new Error("This notification provider requires the authenticated delivery route.");
  const safePayload = { ...input };
  delete safePayload.provider;
  return { destination: target, payload: safePayload, headers: { "X-GuardRails-Event": String(input.event || "monitoring_alert") } };
}
