import { beforeEach, describe, expect, it, vi } from "vitest";
const { authenticated, requireTeamRole, getWorkspaceState, saveState } = vi.hoisted(() => ({ authenticated: vi.fn(), requireTeamRole: vi.fn(), getWorkspaceState: vi.fn(), saveState: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authenticated })); vi.mock("@/lib/teams", () => ({ requireTeamRole })); vi.mock("@/lib/cloudflareWorkspace", () => ({ getWorkspaceState, saveState })); vi.mock("@/lib/teamApiError", () => ({ teamApiError: () => ({ status: 500, error: "failed" }) }));
import { POST } from "./route";
describe("capability policy rollback", () => {
  beforeEach(() => { authenticated.mockResolvedValue({ user: { id: "owner-1" }, provider: "cloudflare" }); getWorkspaceState.mockResolvedValue({ inventory: { devices: [], installations: [] }, capability_graph: null, audit: [], capability_policy: { schema: "guardrails.capability-policy.v1", version: 2, grants: [], updated_at: "2026-10-21T00:00:00.000Z", updated_by: "owner-1" }, capability_policy_history: [{ schema: "guardrails.capability-policy.v1", version: 1, grants: [], updated_at: "2026-10-20T00:00:00.000Z", updated_by: "owner-1" }] }); });
  it("restores a retained version as a new forward policy version", async () => { const response = await POST(new Request("http://localhost", { method: "POST", body: JSON.stringify({ version: 1 }) }), { params: Promise.resolve({ id: "team-1" }) }); await expect(response.json()).resolves.toMatchObject({ restored_version: 1, policy: { version: 3 } }); expect(saveState).toHaveBeenCalled(); });
});
