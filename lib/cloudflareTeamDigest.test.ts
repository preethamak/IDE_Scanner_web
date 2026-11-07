import { beforeEach, describe, expect, it, vi } from "vitest";

const save = vi.hoisted(() => vi.fn());
vi.mock("@/lib/cloudflarePrivate", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/lib/cloudflarePrivate")>()), saveWorkspaceState: save }));

import { queueCloudflareTeamDigests } from "./cloudflareTeamDigest";

describe("Cloudflare team digest queue", () => {
  beforeEach(() => save.mockReset().mockResolvedValue(undefined));

  it("queues one opt-in digest per channel and records the period", async () => {
    const inserts: unknown[][] = [];
    const db = { prepare: vi.fn(() => ({ all: vi.fn().mockResolvedValue({ results: [{ team_id: "team-1", state_json: JSON.stringify({ watchlist: [{ extension_id: "publisher.extension" }], release_events: [{ extension_id: "publisher.extension", target_version: "1.2.4", created_at: "2026-09-14T00:00:00Z" }], alerts: [], decisions: [], channels: [{ id: "channel-1", kind: "generic_webhook", target: "https://example.com/hook" }], preferences: { weekly_digest: true, digest_weekday: 1, digest_hour_utc: 9 }, digest_deliveries: [] }) }] }), bind: vi.fn((...values: unknown[]) => ({ first: vi.fn().mockResolvedValue(null), run: vi.fn(() => { inserts.push(values); return Promise.resolve({ success: true }); }) })) })) } as never;
    const result = await queueCloudflareTeamDigests(db, "2026-09-14T10:00:00.000Z");
    expect(result).toEqual({ teams_checked: 1, queued: 1 });
    expect(inserts[0]).toContain("generic_webhook");
    expect(String(inserts[0]?.[4])).toContain('"provider":"generic_webhook"');
    expect(save).toHaveBeenCalledWith("team-1", expect.objectContaining({ digest_deliveries: [expect.objectContaining({ status: "pending" })] }), expect.any(String));
  });

  it("retains monitoring and policy evidence when recording a digest", async () => {
    const original = JSON.stringify({ preferences: { weekly_digest: true, digest_weekday: 1, digest_hour_utc: 9 }, channels: [{ id: "email-1", kind: "email_resend", target: "reviewer@example.test" }], monitoring: { status: "healthy", last_checked_at: "2026-09-14T09:00:00Z" }, capability_policy: { version: 7 }, capability_graph: { id: "graph-1" } });
    const db = { prepare: () => ({ all: async () => ({ results: [{ team_id: "team-1", state_json: original }] }), bind: () => ({ first: async () => null, run: async () => ({ success: true }) }) }) } as never;
    await queueCloudflareTeamDigests(db, "2026-09-14T10:00:00.000Z");
    expect(save).toHaveBeenCalledWith("team-1", expect.objectContaining({ monitoring: { status: "healthy", last_checked_at: "2026-09-14T09:00:00Z" }, capability_policy: { version: 7 }, capability_graph: { id: "graph-1" } }), original);
  });
});
