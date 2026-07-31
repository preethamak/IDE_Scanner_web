import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ authenticated: vi.fn(), role: vi.fn(), maybeSingle: vi.fn(), from: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authenticated: mocks.authenticated }));
vi.mock("@/lib/teams", () => ({ requireTeamRole: mocks.role }));
vi.mock("@/lib/supabase", () => ({ serviceDb: () => ({ from: mocks.from }) }));
import { PATCH } from "./route";

describe("team alert dismissal", () => {
  beforeEach(() => {
    mocks.authenticated.mockResolvedValue({ user: { id: "viewer" } });
    mocks.role.mockResolvedValue("viewer");
    mocks.maybeSingle.mockResolvedValue({ data: { id: "11111111-1111-4111-8111-111111111111", state: "dismissed", dismissal_reason: "Duplicate release notification." }, error: null });
    mocks.from.mockReturnValue({ update: () => ({ eq: () => ({ eq: () => ({ select: () => ({ maybeSingle: mocks.maybeSingle }) }) }) }) });
  });

  it("rejects dismissal without an auditable reason before mutating the alert", async () => {
    const response = await PATCH(new Request("http://localhost", { method: "PATCH", body: JSON.stringify({ alert_id: "11111111-1111-4111-8111-111111111111", state: "dismissed" }) }), { params: Promise.resolve({ id: "team-1" }) });
    expect(response.status).toBe(400);
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("allows a viewer to dismiss a team alert with a bounded reason", async () => {
    const response = await PATCH(new Request("http://localhost", { method: "PATCH", body: JSON.stringify({ alert_id: "11111111-1111-4111-8111-111111111111", state: "dismissed", dismissal_reason: "Duplicate release notification." }) }), { params: Promise.resolve({ id: "team-1" }) });
    expect(response.status).toBe(200);
    expect(mocks.role).toHaveBeenCalledWith("team-1", "viewer", ["owner", "admin", "analyst", "viewer"]);
  });
});
