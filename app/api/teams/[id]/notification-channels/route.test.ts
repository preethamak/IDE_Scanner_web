import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authenticated: vi.fn(),
  role: vi.fn(),
  encrypt: vi.fn(),
  configured: vi.fn(),
  emailConfigured: vi.fn(),
  single: vi.fn(),
  from: vi.fn(),
  entitlement: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ authenticated: mocks.authenticated }));
vi.mock("@/lib/teams", () => ({ requireTeamRole: mocks.role }));
vi.mock("@/lib/notificationCrypto", () => ({
  encryptTarget: mocks.encrypt,
  outboundNotificationsConfigured: mocks.configured,
}));
vi.mock("@/lib/emailNotification", () => ({
  emailDeliveryConfigured: mocks.emailConfigured,
  isNotificationEmail: (value: string) => value === "security@example.com",
}));
vi.mock("@/lib/supabase", () => ({ serviceDb: () => ({ from: mocks.from }) }));
vi.mock("@/lib/entitlements", () => ({ requireEntitlement: mocks.entitlement, EntitlementError: class EntitlementError extends Error {} }));
import { GET, POST } from "./route";

describe("team notification channel configuration", () => {
  beforeEach(() => {
    mocks.authenticated.mockResolvedValue({ user: { id: "owner" } });
    mocks.role.mockResolvedValue("owner");
    mocks.entitlement.mockResolvedValue({ allowed: true });
    mocks.configured.mockReturnValue(true);
    mocks.emailConfigured.mockReturnValue(true);
    mocks.encrypt.mockReturnValue("encrypted");
    mocks.single.mockResolvedValue({
      data: {
        id: "11111111-1111-4111-8111-111111111111",
        kind: "generic_webhook",
      },
      error: null,
    });
    mocks.from.mockReturnValue({
      insert: () => ({ select: () => ({ single: mocks.single }) }),
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("ok", { status: 200 })),
    );
  });

  it("rejects local generic targets before opening a server-side connection", async () => {
    const response = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({
          kind: "generic_webhook",
          webhook_url: "https://127.0.0.1/hook",
          label: "Internal",
          minimum_severity: "MEDIUM",
        }),
      }),
      { params: Promise.resolve({ id: "team-1" }) },
    );
    expect(response.status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("validates and encrypts an HTTPS generic webhook before storing it", async () => {
    const response = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({
          kind: "generic_webhook",
          webhook_url: "https://hooks.example.com/guardrails",
          label: "Security relay",
          minimum_severity: "HIGH",
        }),
      }),
      { params: Promise.resolve({ id: "team-1" }) },
    );
    expect(response.status).toBe(201);
    expect(mocks.encrypt).toHaveBeenCalledWith(
      "https://hooks.example.com/guardrails",
    );
    expect(fetch).toHaveBeenCalledWith(
      "https://hooks.example.com/guardrails",
      expect.objectContaining({ redirect: "error" }),
    );
  });

  it("loads channel health and recent delivery outcomes without returning targets", async () => {
    mocks.from.mockImplementation((table: string) =>
      table === "team_notification_channels"
        ? {
            select: () => ({
              eq: () => ({
                order: vi
                  .fn()
                  .mockResolvedValue({
                    data: [
                      { id: "channel-1", label: "Slack", last_error: null },
                    ],
                    error: null,
                  }),
              }),
            }),
          }
        : {
            select: () => ({
              eq: () => ({
                order: () => ({
                  limit: vi
                    .fn()
                    .mockResolvedValue({
                      data: [
                        {
                          id: "delivery-1",
                          channel_id: "channel-1",
                          status: "sent",
                        },
                      ],
                      error: null,
                    }),
                }),
              }),
            }),
          },
    );
    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ id: "team-1" }),
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      configured: true,
      channels: [{ id: "channel-1" }],
      deliveries: [{ status: "sent" }],
    });
    expect(JSON.stringify(body)).not.toContain("target_encrypted");
  });

  it("connects email using its own target field without requiring a webhook URL", async () => {
    const response = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({
          kind: "email_resend",
          email: "security@example.com",
          label: "Security email",
          minimum_severity: "HIGH",
        }),
      }),
      { params: Promise.resolve({ id: "team-1" }) },
    );
    expect(response.status).toBe(201);
    expect(mocks.encrypt).toHaveBeenCalledWith("security@example.com");
    expect(fetch).not.toHaveBeenCalled();
  });
});
