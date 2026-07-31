import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ authenticated: vi.fn(), role: vi.fn(), maybeSingle: vi.fn(), from: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authenticated: mocks.authenticated }));
vi.mock("@/lib/teams", () => ({ requireTeamRole: mocks.role }));
vi.mock("@/lib/supabase", () => ({ serviceDb: () => ({ from: mocks.from }) }));
import { DELETE } from "./route";

describe("team watchlist removal", () => {
  beforeEach(() => {
    mocks.authenticated.mockResolvedValue({ user: { id: "analyst" } });
    mocks.role.mockResolvedValue("analyst");
    mocks.maybeSingle.mockResolvedValue({ data: { extension_id: "GitHub.copilot" }, error: null });
    mocks.from.mockReturnValue({ delete: () => ({ eq: () => ({ ilike: () => ({ select: () => ({ maybeSingle: mocks.maybeSingle }) }) }) }) });
  });

  it("rejects malformed extension identifiers before accessing the database", async () => {
    const response = await DELETE(new Request("http://localhost?extension_id=bad"), { params: Promise.resolve({ id: "team" }) });
    expect(response.status).toBe(400);
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("allows analysts to remove only the selected team extension", async () => {
    const response = await DELETE(new Request("http://localhost?extension_id=GitHub.copilot"), { params: Promise.resolve({ id: "team-1" }) });
    expect(response.status).toBe(204);
    expect(mocks.role).toHaveBeenCalledWith("team-1", "analyst", ["owner", "admin", "analyst"]);
  });
});
