import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ authenticated: vi.fn(), role: vi.fn(), maybeSingle: vi.fn(), from: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authenticated: mocks.authenticated }));
vi.mock("@/lib/teams", () => ({ requireTeamRole: mocks.role }));
vi.mock("@/lib/supabase", () => ({ serviceDb: () => ({ from: mocks.from }) }));
import { DELETE, POST } from "./route";

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

  it("anchors monitoring to a complete exact-artifact baseline", async () => {
    const single = vi.fn().mockResolvedValue({ data: { extension_id: "GitHub.copilot", baseline_version: "1.2.3", baseline_artifact_sha256: "a".repeat(64), monitoring_state: "monitoring" }, error: null });
    const upsert = vi.fn(() => ({ select: () => ({ single }) }));
    const scan = { select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: { id: "11111111-1111-4111-8111-111111111111", version: "1.2.3", artifact_sha256: "a".repeat(64), analysis_status: "complete", coverage_percent: 100 }, error: null }) }) }) }) };
    const extension = { select: () => ({ ilike: () => ({ maybeSingle: () => Promise.resolve({ data: { id: "GitHub.copilot" }, error: null }) }) }) };
    mocks.from.mockImplementation((table: string) => table === "extensions" ? extension : table === "scans" ? scan : { upsert });
    const response = await POST(new Request("http://localhost", { method: "POST", body: JSON.stringify({ extension_id: "GitHub.copilot", baseline_scan_id: "11111111-1111-4111-8111-111111111111" }) }), { params: Promise.resolve({ id: "team-1" }) });
    expect(response.status).toBe(201);
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ baseline_version: "1.2.3", monitoring_state: "monitoring" }), { onConflict: "team_id,extension_id" });
  });

  it("rejects an otherwise complete report when evidence coverage is incomplete", async () => {
    const scan = { select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: { id: "11111111-1111-4111-8111-111111111111", version: "1.2.3", artifact_sha256: "a".repeat(64), analysis_status: "complete", coverage_percent: 87 }, error: null }) }) }) }) };
    const extension = { select: () => ({ ilike: () => ({ maybeSingle: () => Promise.resolve({ data: { id: "GitHub.copilot" }, error: null }) }) }) };
    mocks.from.mockImplementation((table: string) => table === "extensions" ? extension : table === "scans" ? scan : { upsert: vi.fn() });
    const response = await POST(new Request("http://localhost", { method: "POST", body: JSON.stringify({ extension_id: "GitHub.copilot", baseline_scan_id: "11111111-1111-4111-8111-111111111111" }) }), { params: Promise.resolve({ id: "team-1" }) });
    expect(response.status).toBe(400);
  });

  it("rejects a malformed baseline scan before looking it up", async () => {
    const response = await POST(new Request("http://localhost", { method: "POST", body: JSON.stringify({ extension_id: "GitHub.copilot", baseline_scan_id: "not-a-uuid" }) }), { params: Promise.resolve({ id: "team-1" }) });
    expect(response.status).toBe(400);
  });
});
