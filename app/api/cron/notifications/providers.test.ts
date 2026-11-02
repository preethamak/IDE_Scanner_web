import { afterEach, describe, expect, it, vi } from "vitest";

const { privateDb } = vi.hoisted(() => ({ privateDb: vi.fn() }));
vi.mock("@/lib/cloudflarePrivate", () => ({ privateDb, nowIso: () => "2026-11-02T00:00:00.000Z" }));
vi.mock("@/lib/cloudflareDeepScan", () => ({ cloudflarePrivateAvailable: () => true }));
vi.mock("@/lib/cloudflareTeamDigest", () => ({ queueCloudflareTeamDigests: async () => ({ queued: 0 }) }));
vi.mock("@/lib/runtimeEnv", () => ({ runtimeEnv: (key: string) => ({ NOTIFICATION_CRON_SECRET: "cron-test-secret", RESEND_API_KEY: "resend-test-key", NOTIFICATION_FROM_EMAIL: "alerts@example.test" })[key] || "" }));

import { POST } from "./route";

describe("authenticated Cloudflare notification providers", () => {
  afterEach(() => vi.unstubAllGlobals());

  it.each([
    ["email_resend", "owner@example.test", "https://api.resend.com/emails", "Bearer resend-test-key"],
    ["jira_cloud", JSON.stringify({ site: "https://example.atlassian.net", email: "owner@example.test", api_token: "jira-test-token", project_key: "SEC" }), "https://example.atlassian.net/rest/api/3/issue", `Basic ${Buffer.from("owner@example.test:jira-test-token").toString("base64")}`],
  ])("delivers %s through the cron route", async (kind, target, destination, authorization) => {
    const run = vi.fn().mockResolvedValue({});
    privateDb.mockReturnValue({ prepare: (query: string) => ({ bind: () => ({
      all: async () => ({ results: query.startsWith("SELECT") ? [{ id: "delivery-1", kind, target, payload_json: "{}", attempts: 0 }] : [] }), run,
    }) }) });
    const fetch = vi.fn().mockResolvedValue(new Response("ok"));
    vi.stubGlobal("fetch", fetch);
    const response = await POST(new Request("https://abscissa.dev/api/cron/notifications", { method: "POST", headers: { authorization: "Bearer cron-test-secret" } }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ sent: 1, failed: 0, dead_lettered: 0 });
    expect(fetch).toHaveBeenCalledWith(destination, expect.objectContaining({ headers: expect.objectContaining({ Authorization: authorization }) }));
    expect(run).toHaveBeenCalledOnce();
  });
});
