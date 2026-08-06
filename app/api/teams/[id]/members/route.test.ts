import { beforeEach, describe, expect, it, vi } from "vitest";
import { TeamAuthorizationError } from "@/lib/teamApiError";

const OWNER_ID = "11111111-1111-4111-8111-111111111111";
const MEMBER_ID = "22222222-2222-4222-8222-222222222222";
const mocks = vi.hoisted(() => {
  class AuthenticationError extends Error {}
  return {
    authenticated: vi.fn(),
    role: vi.fn(),
    from: vi.fn(),
    rpc: vi.fn(),
    members: vi.fn(),
    profiles: vi.fn(),
    AuthenticationError,
  };
});
vi.mock("@/lib/auth", () => ({
  authenticated: mocks.authenticated,
  AuthenticationError: mocks.AuthenticationError,
}));
vi.mock("@/lib/teams", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/teams")>("@/lib/teams");
  return { ...actual, requireTeamRole: mocks.role };
});
vi.mock("@/lib/supabase", () => ({
  serviceDb: () => ({ from: mocks.from, rpc: mocks.rpc }),
}));
import { DELETE, GET, PATCH } from "./route";

const context = { params: Promise.resolve({ id: "team-1" }) };

describe("team membership administration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authenticated.mockResolvedValue({ user: { id: OWNER_ID } });
    mocks.role.mockResolvedValue("owner");
    mocks.members.mockResolvedValue({
      data: [{ user_id: OWNER_ID, role: "owner" }],
      error: null,
    });
    mocks.profiles.mockResolvedValue({
      data: [{ id: OWNER_ID, display_name: "Owner" }],
      error: null,
    });
    mocks.rpc.mockResolvedValue({
      data: { user_id: MEMBER_ID, role: "analyst", previous_role: "viewer" },
      error: null,
    });
    mocks.from.mockImplementation((table: string) =>
      table === "team_members"
        ? { select: () => ({ eq: () => ({ order: mocks.members }) }) }
        : { select: () => ({ in: mocks.profiles }) },
    );
  });

  it("loads profiles separately from memberships instead of relying on a missing PostgREST relation", async () => {
    const response = await GET(new Request("http://localhost"), context);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      members: [
        {
          user_id: OWNER_ID,
          role: "owner",
          profiles: { display_name: "Owner" },
        },
      ],
    });
    expect(mocks.role).toHaveBeenCalledWith("team-1", OWNER_ID, [
      "owner",
      "admin",
      "analyst",
      "viewer",
    ]);
  });

  it("changes a role through the atomic membership policy", async () => {
    const response = await PATCH(
      new Request("http://localhost", {
        method: "PATCH",
        body: JSON.stringify({ user_id: MEMBER_ID, role: "analyst" }),
      }),
      context,
    );
    expect(response.status).toBe(200);
    expect(mocks.role).toHaveBeenCalledWith("team-1", OWNER_ID, [
      "owner",
      "admin",
    ]);
    expect(mocks.rpc).toHaveBeenCalledWith("manage_team_member", {
      target_team: "team-1",
      actor: OWNER_ID,
      subject: MEMBER_ID,
      desired_role: "analyst",
    });
  });

  it("removes a member through the same serialized policy", async () => {
    mocks.rpc.mockResolvedValue({
      data: { user_id: MEMBER_ID, removed: true, previous_role: "viewer" },
      error: null,
    });
    const response = await DELETE(
      new Request("http://localhost", {
        method: "DELETE",
        body: JSON.stringify({ user_id: MEMBER_ID }),
      }),
      context,
    );
    expect(response.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith(
      "manage_team_member",
      expect.objectContaining({ subject: MEMBER_ID, desired_role: null }),
    );
  });

  it("returns a conflict when a caller tries to remove the final owner", async () => {
    mocks.rpc.mockResolvedValue({
      data: null,
      error: {
        message: "The final workspace owner cannot be removed or demoted.",
      },
    });
    const response = await DELETE(
      new Request("http://localhost", {
        method: "DELETE",
        body: JSON.stringify({ user_id: OWNER_ID }),
      }),
      context,
    );
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: "The final workspace owner cannot be removed or demoted.",
    });
  });

  it("rejects malformed member mutations before the database call", async () => {
    const response = await PATCH(
      new Request("http://localhost", {
        method: "PATCH",
        body: JSON.stringify({ user_id: "not-a-user", role: "superuser" }),
      }),
      context,
    );
    expect(response.status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("returns 401 when the session is invalid", async () => {
    mocks.authenticated.mockRejectedValue(
      new mocks.AuthenticationError("Authentication required."),
    );
    const response = await GET(new Request("http://localhost"), context);
    expect(response.status).toBe(401);
  });

  it("returns 403 only for an authorization failure", async () => {
    mocks.role.mockRejectedValue(new TeamAuthorizationError());
    const response = await PATCH(
      new Request("http://localhost", { method: "PATCH", body: "{}" }),
      context,
    );
    expect(response.status).toBe(403);
  });

  it("does not mislabel a profile lookup failure as forbidden", async () => {
    mocks.profiles.mockResolvedValue({
      data: null,
      error: new Error("relationship query failed"),
    });
    const response = await GET(new Request("http://localhost"), context);
    expect(response.status).toBe(503);
  });
});
