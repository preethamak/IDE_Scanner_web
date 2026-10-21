import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ authenticated: vi.fn(), requireTeamRole: vi.fn(), from: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authenticated: mocks.authenticated }));
vi.mock("@/lib/teams", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/lib/teams")>()), requireTeamRole: mocks.requireTeamRole }));
vi.mock("@/lib/supabase", () => ({ serviceDb: () => ({ from: mocks.from }) }));

import { GET } from "./route";

describe("GET /api/teams/:id/api-key-usage", () => {
  it("limits administrative usage records to the owning workspace", async () => {
    mocks.authenticated.mockResolvedValue({ user: { id: "user-1" }, provider: "supabase" });
    const limit = vi.fn().mockResolvedValue({ data: [], error: null });
    const order = vi.fn(() => ({ limit }));
    const eq = vi.fn(() => ({ order }));
    mocks.from.mockReturnValue({ select: () => ({ eq }) });
    const response = await GET(new Request("https://abscissa.dev/api/teams/team-1/api-key-usage?limit=20"), { params: Promise.resolve({ id: "team-1" }) });
    expect(response.status).toBe(200);
    expect(mocks.requireTeamRole).toHaveBeenCalledWith("team-1", "user-1", ["owner", "admin"]);
    expect(eq).toHaveBeenCalledWith("team_id", "team-1");
    expect(limit).toHaveBeenCalledWith(20);
  });

  it("rejects a malformed key filter before querying usage", async () => {
    mocks.authenticated.mockResolvedValue({ user: { id: "user-1" }, provider: "supabase" });
    const response = await GET(new Request("https://abscissa.dev/api/teams/team-1/api-key-usage?key_id=nope"), { params: Promise.resolve({ id: "team-1" }) });
    expect(response.status).toBe(400);
  });
});
