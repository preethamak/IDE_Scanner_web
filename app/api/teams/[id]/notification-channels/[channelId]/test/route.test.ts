import { beforeEach, describe, expect, it, vi } from "vitest";

const CHANNEL_ID = "11111111-1111-4111-8111-111111111111";
const mocks = vi.hoisted(() => ({
  authenticated: vi.fn(),
  role: vi.fn(),
  deliver: vi.fn(),
  from: vi.fn(),
  maybeSingle: vi.fn(),
  update: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ authenticated: mocks.authenticated }));
vi.mock("@/lib/teams", () => ({ requireTeamRole: mocks.role }));
vi.mock("@/lib/teamNotificationDelivery", () => ({
  deliverTeamChannelTest: mocks.deliver,
}));
vi.mock("@/lib/supabase", () => ({ serviceDb: () => ({ from: mocks.from }) }));
import { POST } from "./route";

const context = {
  params: Promise.resolve({ id: "team-1", channelId: CHANNEL_ID }),
};

describe("team channel test delivery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authenticated.mockResolvedValue({ user: { id: "owner" } });
    mocks.role.mockResolvedValue("owner");
    mocks.maybeSingle.mockResolvedValue({
      data: {
        id: CHANNEL_ID,
        kind: "slack_webhook",
        target_encrypted: "encrypted",
        enabled: true,
      },
      error: null,
    });
    mocks.deliver.mockResolvedValue({
      provider: "Slack",
      delivered_at: "2026-08-06T15:00:00.000Z",
    });
    const selectChain = { eq: vi.fn(() => selectTeamChain) };
    const selectTeamChain = {
      eq: vi.fn(() => ({ maybeSingle: mocks.maybeSingle })),
    };
    const updateTeamChain = { eq: vi.fn().mockResolvedValue({ error: null }) };
    const updateChain = { eq: vi.fn(() => updateTeamChain) };
    mocks.from.mockReturnValue({
      select: vi.fn(() => selectChain),
      update: vi.fn(() => updateChain),
    });
  });

  it("requires an owner or administrator and sends the stored channel a real test", async () => {
    const response = await POST(
      new Request("http://localhost", { method: "POST" }),
      context,
    );
    expect(response.status).toBe(200);
    expect(mocks.role).toHaveBeenCalledWith("team-1", "owner", [
      "owner",
      "admin",
    ]);
    expect(mocks.deliver).toHaveBeenCalledWith(
      expect.objectContaining({ id: CHANNEL_ID, kind: "slack_webhook" }),
    );
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      provider: "Slack",
    });
  });

  it("records provider failures without exposing the encrypted target", async () => {
    mocks.deliver.mockRejectedValue(new Error("Slack returned HTTP 403."));
    const response = await POST(
      new Request("http://localhost", { method: "POST" }),
      context,
    );
    expect(response.status).toBe(502);
    const body = await response.json();
    expect(body).toEqual({ error: "Slack returned HTTP 403." });
    expect(JSON.stringify(body)).not.toContain("encrypted");
  });

  it("does not test a disabled channel", async () => {
    mocks.maybeSingle.mockResolvedValue({
      data: { id: CHANNEL_ID, enabled: false },
      error: null,
    });
    const response = await POST(
      new Request("http://localhost", { method: "POST" }),
      context,
    );
    expect(response.status).toBe(409);
    expect(mocks.deliver).not.toHaveBeenCalled();
  });
});
