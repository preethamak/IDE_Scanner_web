import { beforeEach, describe, expect, it, vi } from "vitest";
import { TeamAuthorizationError } from "@/lib/teamApiError";

const mocks = vi.hoisted(() => {
  class AuthenticationError extends Error {}
  return { authenticated: vi.fn(), role: vi.fn(), from: vi.fn(), members: vi.fn(), profiles: vi.fn(), AuthenticationError };
});
vi.mock("@/lib/auth", () => ({ authenticated: mocks.authenticated, AuthenticationError: mocks.AuthenticationError }));
vi.mock("@/lib/teams", () => ({ requireTeamRole: mocks.role }));
vi.mock("@/lib/supabase", () => ({ serviceDb: () => ({ from: mocks.from }) }));
import { GET } from "./route";

describe("team member lookup", () => {
  beforeEach(() => {
    mocks.authenticated.mockResolvedValue({ user: { id: "owner" } });
    mocks.role.mockResolvedValue("owner");
    mocks.members.mockResolvedValue({ data: [{ user_id: "owner", role: "owner" }], error: null });
    mocks.profiles.mockResolvedValue({ data: [{ id: "owner", display_name: "Owner" }], error: null });
    mocks.from.mockImplementation((table: string) => table === "team_members"
      ? { select: () => ({ eq: () => ({ order: mocks.members }) }) }
      : { select: () => ({ in: mocks.profiles }) });
  });

  it("loads profiles separately from memberships instead of relying on a missing PostgREST relation", async () => {
    const response = await GET(new Request("http://localhost"), { params: Promise.resolve({ id: "team-1" }) });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ members: [{ user_id: "owner", role: "owner", profiles: { display_name: "Owner" } }] });
    expect(mocks.role).toHaveBeenCalledWith("team-1", "owner", ["owner", "admin", "analyst", "viewer"]);
  });

  it("returns 401 when the session is invalid", async () => {
    mocks.authenticated.mockRejectedValue(new mocks.AuthenticationError("Authentication required."));
    const response = await GET(new Request("http://localhost"), { params: Promise.resolve({ id: "team-1" }) });
    expect(response.status).toBe(401);
  });

  it("returns 403 only for an authorization failure", async () => {
    mocks.role.mockRejectedValue(new TeamAuthorizationError());
    const response = await GET(new Request("http://localhost"), { params: Promise.resolve({ id: "team-1" }) });
    expect(response.status).toBe(403);
  });

  it("does not mislabel a profile lookup failure as forbidden", async () => {
    mocks.profiles.mockResolvedValue({ data: null, error: new Error("relationship query failed") });
    const response = await GET(new Request("http://localhost"), { params: Promise.resolve({ id: "team-1" }) });
    expect(response.status).toBe(503);
  });
});
