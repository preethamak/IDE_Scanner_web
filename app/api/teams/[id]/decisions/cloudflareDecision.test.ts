import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), role: vi.fn(), state: vi.fn(), save: vi.fn(), accessible: vi.fn(), member: vi.fn(), nextId: 0 }));
vi.mock("@/lib/auth", () => ({ authenticated: mocks.auth, AuthenticationError: class extends Error {} }));
vi.mock("@/lib/teams", async (original) => ({ ...(await original<typeof import("@/lib/teams")>()), requireTeamRole: mocks.role }));
vi.mock("@/lib/cloudflareWorkspace", () => ({ getWorkspaceState: mocks.state, saveState: mocks.save }));
vi.mock("@/lib/cloudflareScanAccess", () => ({ getCloudflareAccessibleScanIdentity: mocks.accessible }));
vi.mock("@/lib/cloudflarePrivate", () => ({ newId: () => `id-${++mocks.nextId}`, nowIso: () => "2026-11-07T09:00:00.000Z", privateDb: () => ({ prepare: () => ({ bind: () => ({ first: mocks.member }) }) }) }));
import { POST } from "./route";
import { WorkspaceConflictError } from "@/lib/workspaceConflict";
const scanId = "11111111-1111-4111-8111-111111111111";
const memberId = "22222222-2222-4222-8222-222222222222";
const context = { params: Promise.resolve({ id: "team-1" }) };
function request(fields: Record<string, unknown> = {}) {
  return new Request("https://example.test/api/teams/team-1/decisions", { method: "POST", body: JSON.stringify({ scan_id: scanId, decision: "review", rationale: "Review process execution", ...fields }) });
}
describe("D1 decision authorization and durable evidence", () => {
  beforeEach(() => {
    vi.resetAllMocks(); mocks.nextId = 0;
    mocks.auth.mockResolvedValue({ user: { id: "reviewer-1" }, provider: "cloudflare" });
    mocks.role.mockResolvedValue("analyst");
    mocks.state.mockResolvedValue({ decisions: [], audit: [] });
    mocks.accessible.mockResolvedValue({ scan_id: scanId, extension_id: "publisher.extension", version: "1.0.0" });
    mocks.member.mockResolvedValue({ user_id: memberId });
    mocks.save.mockResolvedValue(undefined);
  });
  it("checks team write permission before inspecting scan evidence", async () => {
    mocks.role.mockRejectedValue(new Error("Forbidden"));
    expect((await POST(request(), context)).status).toBeGreaterThanOrEqual(400);
    expect(mocks.state).not.toHaveBeenCalled(); expect(mocks.accessible).not.toHaveBeenCalled(); expect(mocks.save).not.toHaveBeenCalled();
  });
  it("refuses to bind another user's unshared scan into this workspace", async () => {
    mocks.accessible.mockResolvedValue(null);
    expect((await POST(request(), context)).status).toBe(404);
    expect(mocks.accessible).toHaveBeenCalledWith(scanId, "reviewer-1"); expect(mocks.save).not.toHaveBeenCalled();
  });
  it.each(["allow", "block", "exception"])("requires a reason for an %s decision", async (decision) => {
    expect((await POST(request({ decision, rationale: "   " }), context)).status).toBe(400);
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it("allows an open review without a final decision reason", async () => {
    expect((await POST(request({ rationale: "" }), context)).status).toBe(201);
  });
  it("rejects an oversized reason instead of silently changing its content", async () => {
    expect((await POST(request({ rationale: "x".repeat(4001) }), context)).status).toBe(400);
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it("persists rationale and returns the exact durable audit event and receipt", async () => {
    const response = await POST(request(), context); const body = await response.json();
    expect(response.status).toBe(201);
    const state = mocks.save.mock.calls[0][1];
    expect(body.rationale).toBe("Review process execution");
    expect(body.audit_receipt).toMatchObject({ id: state.audit[0].receipt_id, event_id: state.audit[0].event_id, actor_id: "reviewer-1" });
    expect(body.audit_receipt.id).not.toBe(body.id); expect(state.audit[0].resulting_state.rationale).toBe(body.rationale);
  });
  it("rejects an invalid assignee", async () => {
    expect((await POST(request({ assigned_to: "not-a-user" }), context)).status).toBe(400); expect(mocks.save).not.toHaveBeenCalled();
  });
  it("rejects an assignee outside this team", async () => {
    mocks.member.mockResolvedValue(null);
    expect((await POST(request({ assigned_to: memberId }), context)).status).toBe(400); expect(mocks.save).not.toHaveBeenCalled();
  });
  it("updates assignment and preserves the prior decision in the audit", async () => {
    mocks.state.mockResolvedValue({ decisions: [{ id: "decision-1", scan_id: scanId, extension_id: "publisher.extension", version: "1.0.0", decision: "review", rationale: "Old reason", assigned_to: null }], audit: [] });
    const response = await POST(request({ assigned_to: memberId, decision: "allow", rationale: "Reviewed exact artifact" }), context);
    const body = await response.json(); const state = mocks.save.mock.calls[0][1];
    expect(response.status).toBe(200); expect(body.assigned_to).toBe(memberId);
    expect(state.audit[0].previous_state).toMatchObject({ decision: "review", rationale: "Old reason" });
    expect(state.audit[0].resulting_state).toMatchObject({ decision: "allow", assigned_to: memberId });
    expect(mocks.accessible).not.toHaveBeenCalled();
  });
  it("returns the original receipt when an identical completed request is retried", async () => {
    await POST(request({ decision: "allow" }), context);
    const state = mocks.save.mock.calls[0][1]; mocks.state.mockResolvedValue(state); mocks.save.mockClear();
    const response = await POST(request({ decision: "allow" }), context); const body = await response.json();
    expect(response.status).toBe(200); expect(body.audit_receipt.event_id).toBe(state.audit[0].event_id);
    expect(state.audit).toHaveLength(1); expect(mocks.save).not.toHaveBeenCalled();
  });
  it("does not claim success when persistence fails", async () => {
    mocks.save.mockRejectedValue(new Error("D1 unavailable"));
    expect((await POST(request(), context)).status).toBe(503);
  });
  it("reports stale workspace writes as a recoverable conflict", async () => {
    mocks.save.mockRejectedValue(new WorkspaceConflictError());
    const response = await POST(request(), context); expect(response.status).toBe(409);
    expect((await response.json()).error).toContain("Reload");
  });
});
