import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireTeamRole: vi.fn(),
  serviceDb: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  authenticated: async () => ({ user: { id: "user-1" } }),
}));
vi.mock("@/lib/teams", () => ({
  requireTeamRole: mocks.requireTeamRole,
}));
vi.mock("@/lib/supabase", () => ({ serviceDb: mocks.serviceDb }));

import { GET } from "./route";

describe("workspace audit route authorization", () => {
  beforeEach(() => {
    mocks.requireTeamRole.mockReset();
    mocks.serviceDb.mockReset();
  });

  it("allows viewers to read but not download workspace audit data", async () => {
    mocks.requireTeamRole.mockResolvedValue("viewer");
    const response = await GET(
      new Request("http://localhost/api/teams/team-1/audit?format=csv"),
      { params: Promise.resolve({ id: "team-1" }) },
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: "Viewer access does not include audit export.",
    });
    expect(mocks.serviceDb).not.toHaveBeenCalled();
  });
});
