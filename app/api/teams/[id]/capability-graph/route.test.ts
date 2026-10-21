import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ authenticated: vi.fn(), role: vi.fn(), state: vi.fn(), save: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authenticated: mocks.authenticated }));
vi.mock("@/lib/teams", () => ({ requireTeamRole: mocks.role }));
vi.mock("@/lib/cloudflareWorkspace", () => ({ getWorkspaceState: mocks.state, saveState: mocks.save }));

import { GET, POST } from "./route";

const context = { params: Promise.resolve({ id: "team-1" }) };
const workspace = { inventory: { installations: [{ extension_id: "GitHub.copilot", version: "1.2.3", artifact_sha256: null, reported_at: "2026-10-21T10:00:00.000Z" }] }, capability_graph: null, audit: [] };

describe("capability graph API", () => {
  beforeEach(() => {
    mocks.authenticated.mockReset().mockResolvedValue({ user: { id: "analyst-1" }, provider: "cloudflare" });
    mocks.role.mockReset().mockResolvedValue("analyst");
    mocks.state.mockReset().mockResolvedValue(structuredClone(workspace));
    mocks.save.mockReset().mockResolvedValue(undefined);
  });

  it("derives an exact extension subject from workspace inventory", async () => {
    const response = await GET(new Request("http://localhost"), context);
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.graph.subjects[0]).toMatchObject({ id: "extension:github.copilot@1.2.3", evidenceState: "observed" });
    expect(mocks.role).toHaveBeenCalledWith("team-1", "analyst-1", ["owner", "admin", "analyst", "viewer"]);
  });

  it("imports a graph only after workspace authorization and records the operation", async () => {
    const response = await POST(new Request("http://localhost", { method: "POST", body: JSON.stringify({ subjects: [{ id: "mcp_server:github", kind: "mcp_server", name: "GitHub MCP", version: "1", publisher: "GitHub", artifactSha256: null, evidenceState: "observed", observedAt: "2026-10-21T10:00:00.000Z", capabilities: ["network"], source: "collector" }] }) }), context);
    const body = await response.json();
    expect(response.status).toBe(201);
    expect(body.graph.subjects[0].id).toBe("mcp_server:github");
    expect(mocks.save).toHaveBeenCalledOnce();
    expect(mocks.save.mock.calls[0][1].audit[0].action).toBe("capability_graph_imported");
  });

  it("rejects malformed graph input before persisting", async () => {
    const response = await POST(new Request("http://localhost", { method: "POST", body: JSON.stringify({ subjects: [{ id: "bad id" }] }) }), context);
    expect(response.status).toBe(400);
    expect(mocks.save).not.toHaveBeenCalled();
  });
});
