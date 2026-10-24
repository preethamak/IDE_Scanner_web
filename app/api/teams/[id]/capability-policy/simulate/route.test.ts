import { beforeEach, describe, expect, it, vi } from "vitest";

const { authenticated, requireTeamRole, getWorkspaceState } = vi.hoisted(() => ({ authenticated: vi.fn(), requireTeamRole: vi.fn(), getWorkspaceState: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authenticated }));
vi.mock("@/lib/teams", () => ({ requireTeamRole }));
vi.mock("@/lib/cloudflareWorkspace", () => ({ getWorkspaceState }));
vi.mock("@/lib/teamApiError", () => ({ teamApiError: () => ({ status: 500, error: "failed" }) }));
import { POST } from "./route";

describe("capability policy simulation API", () => {
  beforeEach(() => { vi.clearAllMocks(); authenticated.mockResolvedValue({ user: { id: "user-1" }, provider: "cloudflare" }); getWorkspaceState.mockResolvedValue({ inventory: { installations: [], devices: [] }, capability_graph: { schemaVersion: "2026-10-01", workspaceId: "team-1", generatedAt: "2026-10-21T00:00:00.000Z", subjects: [], relationships: [] }, capability_policy: null }); });
  it("evaluates a draft without saving it", async () => {
    const response = await POST(new Request("https://abscissa.dev/api/teams/team-1/capability-policy/simulate", { method: "POST", body: JSON.stringify({ grants: [] }) }), { params: Promise.resolve({ id: "team-1" }) });
    await expect(response.json()).resolves.toMatchObject({ simulation: { default_action: "deny", summary: { subjects: 0 } } });
    expect(requireTeamRole).toHaveBeenCalledWith("team-1", "user-1", ["owner", "admin", "analyst"]);
  });
});
