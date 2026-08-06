import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authenticated: vi.fn(),
  role: vi.fn(),
  single: vi.fn(),
  from: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ authenticated: mocks.authenticated }));
vi.mock("@/lib/teams", () => ({ requireTeamRole: mocks.role }));
vi.mock("@/lib/supabase", () => ({ serviceDb: () => ({ from: mocks.from }) }));
import { PATCH } from "./route";

describe("team monitoring preferences", () => {
  beforeEach(() => {
    mocks.authenticated.mockResolvedValue({ user: { id: "owner" } });
    mocks.role.mockResolvedValue("owner");
    mocks.single.mockResolvedValue({
      data: { team_id: "team-1", release_alerts: false },
      error: null,
    });
    mocks.from.mockReturnValue({
      upsert: () => ({ select: () => ({ single: mocks.single }) }),
    });
  });

  it("rejects non-boolean event controls before writing", async () => {
    const response = await PATCH(
      new Request("http://localhost", {
        method: "PATCH",
        body: JSON.stringify({ release_alerts: "false" }),
      }),
      { params: Promise.resolve({ id: "team-1" }) },
    );
    expect(response.status).toBe(400);
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("lets an owner persist an exact event control", async () => {
    const response = await PATCH(
      new Request("http://localhost", {
        method: "PATCH",
        body: JSON.stringify({ release_alerts: false }),
      }),
      { params: Promise.resolve({ id: "team-1" }) },
    );
    expect(response.status).toBe(200);
    expect(mocks.role).toHaveBeenCalledWith("team-1", "owner", [
      "owner",
      "admin",
    ]);
  });

  it("persists a weekly digest schedule", async () => {
    const response = await PATCH(
      new Request("http://localhost", {
        method: "PATCH",
        body: JSON.stringify({
          weekly_digest: true,
          digest_weekday: 3,
          digest_hour_utc: 14,
        }),
      }),
      { params: Promise.resolve({ id: "team-1" }) },
    );
    expect(response.status).toBe(200);
    expect(mocks.from).toHaveBeenCalledWith("team_monitoring_preferences");
  });

  it("rejects an impossible digest schedule before writing", async () => {
    const response = await PATCH(
      new Request("http://localhost", {
        method: "PATCH",
        body: JSON.stringify({ digest_weekday: 8, digest_hour_utc: 24 }),
      }),
      { params: Promise.resolve({ id: "team-1" }) },
    );
    expect(response.status).toBe(400);
    expect(mocks.from).not.toHaveBeenCalled();
  });
});
