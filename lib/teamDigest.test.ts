import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ decrypt: vi.fn() }));
vi.mock("@/lib/notificationCrypto", () => ({ decryptTarget: mocks.decrypt }));
import {
  deliverWeeklyTeamDigests,
  emailDigestPayload,
  slackDigestPayload,
  type TeamDigestSnapshot,
} from "@/lib/teamDigest";

const snapshot: TeamDigestSnapshot = {
  team: "Platform Engineering",
  period_start: "2026-07-27T09:00:00.000Z",
  period_end: "2026-08-03T09:00:00.000Z",
  monitored_extensions: 14,
  release_changes: 3,
  high_priority_changes: 1,
  decisions_recorded: 2,
  needs_review: 1,
  highlights: [
    {
      title: "Added terminal access",
      extension_id: "publisher.agent",
      version: "2.0.0",
      severity: "HIGH",
    },
  ],
};

describe("weekly team security digest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.decrypt.mockReturnValue("https://hooks.slack.com/services/A/B/token");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 204 })),
    );
  });
  it("builds a decision-oriented Slack digest", () => {
    const payload = slackDigestPayload(snapshot);
    expect(payload.text).toContain("Platform Engineering");
    expect(JSON.stringify(payload.blocks)).toContain("1* need review");
    expect(JSON.stringify(payload.blocks)).toContain("publisher.agent@2.0.0");
    expect(JSON.stringify(payload.blocks)).toContain("Open review inbox");
  });

  it("builds a plain-text email with the same accountable numbers", () => {
    const payload = emailDigestPayload(snapshot, "security@example.com");
    expect(payload).toMatchObject({
      to: ["security@example.com"],
      subject: expect.stringContaining("1 release needs review"),
    });
    expect(payload.text).toContain("14 monitored extensions");
    expect(payload.text).toContain("Added terminal access");
  });

  it("queues exactly one Slack or email digest per channel and period", () => {
    const migration = fs.readFileSync(
      path.join(
        process.cwd(),
        "supabase/migrations/20260806170000_weekly_team_security_digest.sql",
      ),
      "utf8",
    );
    expect(migration).toContain("unique(team_id, channel_id, period_start)");
    expect(migration).toContain(
      "on conflict (team_id, channel_id, period_start) do nothing",
    );
    expect(migration).toContain("c.kind in ('slack_webhook', 'email_resend')");
    expect(migration).toContain("target_now >= s.due_at");
  });

  it("is wired into the existing protected notification scheduler", () => {
    const cron = fs.readFileSync(
      path.join(process.cwd(), "app/api/cron/notifications/route.ts"),
      "utf8",
    );
    expect(cron).toContain("deliverWeeklyTeamDigests(db, now)");
    expect(cron).toContain("weekly_digest: digests");
  });

  it("summarizes the period and records a successful Slack delivery", async () => {
    const updates: Array<Record<string, unknown>> = [];
    const digestRows = [
      {
        id: "digest-1",
        team_id: "team-1",
        period_start: snapshot.period_start,
        period_end: snapshot.period_end,
        attempts: 0,
        team_notification_channels: {
          kind: "slack_webhook",
          label: "Security",
          target_encrypted: "secret",
          enabled: true,
        },
        teams: { name: snapshot.team },
      },
    ];
    const terminal = (data: unknown, count?: number) => ({
      data,
      count,
      error: null,
    });
    const chain = (data: unknown) => {
      const value: Record<string, unknown> = {};
      for (const method of ["in", "lte", "gte", "lt", "order", "eq"])
        value[method] = () => value;
      value.limit = () => Promise.resolve(terminal(data));
      return value;
    };
    const db = {
      rpc: vi.fn().mockResolvedValue({ data: 1, error: null }),
      from: vi.fn((table: string) => {
        if (table === "team_digest_deliveries")
          return {
            select: () => chain(digestRows),
            update: (payload: Record<string, unknown>) => {
              updates.push(payload);
              return {
                eq: () => ({
                  in: () => Promise.resolve({ error: null }),
                }),
              };
            },
          };
        if (table === "team_monitoring_alerts")
          return {
            select: () =>
              chain([
                {
                  title: "Added terminal access",
                  extension_id: "publisher.agent",
                  version: "2.0.0",
                  severity: "HIGH",
                  kind: "release_detected",
                  created_at: "2026-08-01T10:00:00.000Z",
                },
              ]),
          };
        if (table === "team_decisions")
          return {
            select: () =>
              chain([
                {
                  decision: "review",
                  updated_at: "2026-08-01T11:00:00.000Z",
                },
                {
                  decision: "allow",
                  updated_at: "2026-08-02T11:00:00.000Z",
                },
              ]),
          };
        if (table === "team_monitoring_preferences")
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () =>
                  Promise.resolve({
                    data: { weekly_digest: true },
                    error: null,
                  }),
              }),
            }),
          };
        return {
          select: () => ({
            eq: () => Promise.resolve(terminal(null, 14)),
          }),
        };
      }),
    };
    const result = await deliverWeeklyTeamDigests(
      db as never,
      "2026-08-03T09:01:00.000Z",
    );
    expect(result).toMatchObject({
      error: "",
      queued: 1,
      considered: 1,
      sent: 1,
      failed: 0,
    });
    expect(fetch).toHaveBeenCalledWith(
      "https://hooks.slack.com/services/A/B/token",
      expect.objectContaining({ method: "POST" }),
    );
    expect(updates).toContainEqual(
      expect.objectContaining({
        status: "sent",
        snapshot: expect.objectContaining({
          monitored_extensions: 14,
          needs_review: 1,
        }),
      }),
    );
  });
});
