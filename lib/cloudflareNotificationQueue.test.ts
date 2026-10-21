import { describe, expect, it, vi } from "vitest";
import {
  MAX_NOTIFICATION_DELIVERY_ATTEMPTS,
  deliverCloudflareNotifications,
  notificationRetryAt,
} from "./cloudflareNotificationQueue";

function database(row: Record<string, unknown>) {
  const statements: Array<{ query: string; values: unknown[] }> = [];
  return {
    statements,
    prepare(query: string) {
      return {
        bind(...values: unknown[]) {
          statements.push({ query, values });
          return {
            all: async () => ({ results: query.startsWith("SELECT") ? [row] : [] }),
            run: async () => ({ results: [] }),
          };
        },
      };
    },
  };
}

describe("Cloudflare notification queue", () => {
  it("uses bounded exponential backoff", () => {
    expect(notificationRetryAt(1, 0)).toBe("1970-01-01T00:02:00.000Z");
    expect(notificationRetryAt(99, 0)).toBe("1970-01-01T00:32:00.000Z");
  });

  it("moves a repeatedly failing delivery to the terminal dead-letter state", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("no", { status: 503 })));
    const db = database({
      id: "delivery-1",
      kind: "generic_webhook",
      target: "https://example.test/hook",
      payload_json: "{}",
      attempts: MAX_NOTIFICATION_DELIVERY_ATTEMPTS - 1,
    });
    const result = await deliverCloudflareNotifications(db as never, "2026-10-21T00:00:00.000Z");
    expect(result).toEqual({ attempted: 1, sent: 0, failed: 1, dead_lettered: 1 });
    expect(db.statements.at(-1)?.values).toContain("dead_letter");
    vi.unstubAllGlobals();
  });

  it("keeps transient failures retryable before the limit", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const db = database({
      id: "delivery-2",
      kind: "generic_webhook",
      target: "https://example.test/hook",
      payload_json: "{}",
      attempts: 0,
    });
    const result = await deliverCloudflareNotifications(db as never, "2026-10-21T00:00:00.000Z");
    expect(result.dead_lettered).toBe(0);
    expect(db.statements.at(-1)?.values).toContain("failed");
    vi.unstubAllGlobals();
  });
});
