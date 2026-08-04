import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ authenticated: vi.fn(), role: vi.fn(), from: vi.fn(), limit: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authenticated: mocks.authenticated }));
vi.mock("@/lib/teams", () => ({ requireTeamRole: mocks.role }));
vi.mock("@/lib/supabase", () => ({ serviceDb: () => ({ from: mocks.from }) }));
import { GET } from "./route";

describe("team release queue", () => {
  beforeEach(() => {
    mocks.authenticated.mockResolvedValue({ user: { id: "member-1" } });
    mocks.role.mockResolvedValue("viewer");
    mocks.limit.mockResolvedValue({ data: [], error: null });
    mocks.from.mockReturnValue({ select: () => ({ eq: () => ({ neq: () => ({ order: () => ({ limit: mocks.limit }) }) }) }) });
  });

  it("loads queue rows without requiring a freshly cached foreign-key embed", async () => {
    const response = await GET(new Request("http://localhost"), { params: Promise.resolve({ id: "team-1" }) });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ events: [] });
    expect(mocks.from).toHaveBeenCalledWith("team_release_events");
  });
});
