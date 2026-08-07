import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  decrypt: vi.fn(),
  emailConfigured: vi.fn(),
}));
vi.mock("@/lib/notificationCrypto", () => ({ decryptTarget: mocks.decrypt }));
vi.mock("@/lib/emailNotification", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/emailNotification")
  >("@/lib/emailNotification");
  return { ...actual, emailDeliveryConfigured: mocks.emailConfigured };
});
import { deliverTeamChannelTest } from "@/lib/teamNotificationDelivery";

describe("provider test delivery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.decrypt.mockReturnValue("https://hooks.example.com/guardrails");
    mocks.emailConfigured.mockReturnValue(true);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 204 })),
    );
  });

  it("marks generic webhook tests with a dedicated non-production event", async () => {
    await expect(
      deliverTeamChannelTest({
        kind: "generic_webhook",
        target_encrypted: "secret",
      }),
    ).resolves.toMatchObject({ provider: "Webhook" });
    expect(fetch).toHaveBeenCalledWith(
      "https://hooks.example.com/guardrails",
      expect.objectContaining({
        headers: expect.objectContaining({
          "X-GuardRails-Event": "integration_test",
        }),
      }),
    );
    const options = vi.mocked(fetch).mock.calls[0][1];
    expect(JSON.parse(String(options?.body))).toMatchObject({
      event: "guardrails.integration_test",
      test: true,
    });
  });

  it("reports the actual provider without returning its decrypted destination", async () => {
    mocks.decrypt.mockReturnValue("https://hooks.slack.com/services/A/B/token");
    const result = await deliverTeamChannelTest({
      kind: "slack_webhook",
      target_encrypted: "secret",
    });
    expect(result).toMatchObject({
      provider: "Slack",
      delivered_at: expect.any(String),
    });
    expect(JSON.stringify(result)).not.toContain("hooks.slack.com");
  });

  it("turns a provider rejection into an actionable error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 429 })),
    );
    await expect(
      deliverTeamChannelTest({
        kind: "generic_webhook",
        target_encrypted: "secret",
      }),
    ).rejects.toThrow("Webhook returned HTTP 429.");
  });
});
