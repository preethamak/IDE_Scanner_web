import { beforeEach, describe, expect, it, vi } from "vitest";
import { TeamAuthorizationError } from "@/lib/teamApiError";

const mocks = vi.hoisted(() => {
  class AuthenticationError extends Error {}
  return { authenticated: vi.fn(), role: vi.fn(), maybeSingle: vi.fn(), from: vi.fn(), AuthenticationError };
});
vi.mock("@/lib/auth", () => ({ authenticated: mocks.authenticated, AuthenticationError: mocks.AuthenticationError }));
vi.mock("@/lib/teams", () => ({ requireTeamRole: mocks.role, teamRole: vi.fn() }));
vi.mock("@/lib/supabase", () => ({ serviceDb: () => ({ from: mocks.from }) }));
import { DELETE, GET } from "./route";

describe("team invitation revocation", () => {
  beforeEach(() => {
    mocks.authenticated.mockResolvedValue({ user: { id: "owner" } }); mocks.role.mockResolvedValue("owner"); mocks.maybeSingle.mockResolvedValue({ data: { id: "11111111-1111-4111-8111-111111111111" }, error: null });
    mocks.from.mockReturnValue({ delete: () => ({ eq: () => ({ eq: () => ({ is: () => ({ select: () => ({ maybeSingle: mocks.maybeSingle }) }) }) }) }) });
  });

  it("rejects malformed invitation ids before querying the database", async () => {
    const response = await DELETE(new Request("http://localhost?invitation_id=bad"), { params: Promise.resolve({ id: "team" }) });
    expect(response.status).toBe(400); expect(mocks.from).not.toHaveBeenCalled();
  });

  it("deletes only a pending invitation in the requested team", async () => {
    const response = await DELETE(new Request("http://localhost?invitation_id=11111111-1111-4111-8111-111111111111"), { params: Promise.resolve({ id: "team-1" }) });
    expect(response.status).toBe(204); expect(mocks.role).toHaveBeenCalledWith("team-1", "owner", ["owner", "admin"]);
  });

  it("does not translate an invitation query failure into 403", async () => {
    mocks.from.mockReturnValue({ select: () => ({ eq: () => ({ order: () => Promise.resolve({ data: null, error: new Error("database unavailable") }) }) }) });
    const response = await GET(new Request("http://localhost"), { params: Promise.resolve({ id: "team-1" }) });
    expect(response.status).toBe(503);
  });

  it("keeps a real authorization failure as 403", async () => {
    mocks.role.mockRejectedValue(new TeamAuthorizationError());
    const response = await GET(new Request("http://localhost"), { params: Promise.resolve({ id: "team-1" }) });
    expect(response.status).toBe(403);
  });
});
