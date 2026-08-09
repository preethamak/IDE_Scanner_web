import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ authenticated: vi.fn(), rpc: vi.fn(), from: vi.fn(), entitlement: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authenticated: mocks.authenticated }));
vi.mock("@/lib/supabase", () => ({ serviceDb: () => ({ rpc: mocks.rpc, from: mocks.from }) }));
vi.mock("@/lib/entitlements", () => ({ requireEntitlement: mocks.entitlement }));
import { POST } from "./route";

describe("team invitation acceptance", () => {
  const token = "a".repeat(43);
  beforeEach(() => {
    mocks.authenticated.mockResolvedValue({ user: { id: "22222222-2222-4222-8222-222222222222" } });
    mocks.rpc.mockReset();
    mocks.entitlement.mockResolvedValue({ allowed: true });
    mocks.from.mockReturnValue({ select: () => ({ eq: () => ({ is: () => ({ gt: () => ({ maybeSingle: () => Promise.resolve({ data: { team_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" }, error: null }) }) }) }) }) });
  });

  it("does not call the database for malformed invitation tokens", async () => {
    const response = await POST(new Request("http://localhost", { method: "POST", body: JSON.stringify({ token: "bad" }) }));
    expect(response.status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("accepts an invitation only for the authenticated second user", async () => {
    mocks.rpc.mockReturnValue({ single: () => Promise.resolve({ data: { team_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", role: "analyst" }, error: null }) });
    const response = await POST(new Request("http://localhost", { method: "POST", body: JSON.stringify({ token }) }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ team_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", role: "analyst" });
    expect(mocks.rpc).toHaveBeenCalledWith("accept_team_invitation", expect.objectContaining({ p_user_id: "22222222-2222-4222-8222-222222222222", p_token_hash: expect.stringMatching(/^[a-f0-9]{64}$/) }));
  });

  it("does not invent a membership when the atomic acceptance RPC returns no workspace", async () => {
    mocks.rpc.mockReturnValue({ single: () => Promise.resolve({ data: null, error: null }) });
    const response = await POST(new Request("http://localhost", { method: "POST", body: JSON.stringify({ token }) }));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Invitation acceptance returned an invalid workspace." });
  });
});
