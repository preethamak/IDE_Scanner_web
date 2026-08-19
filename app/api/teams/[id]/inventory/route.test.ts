import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ authenticated: vi.fn(), role: vi.fn(), from: vi.fn(), rpc: vi.fn() }));
vi.mock("@/lib/auth", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/lib/auth")>()), authenticated: mocks.authenticated }));
vi.mock("@/lib/teams", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/lib/teams")>()), requireTeamRole: mocks.role }));
vi.mock("@/lib/supabase", () => ({ serviceDb: () => ({ from: mocks.from, rpc: mocks.rpc }) }));
import { TeamAuthorizationError } from "@/lib/teamApiError";
import { GET, POST } from "./route";

const context = { params: Promise.resolve({ id: "team-1" }) };
const valid = {
  device: { id: "laptop-1", name: "Developer laptop", platform: "linux" },
  reported_at: "2026-08-18T10:00:00.000Z",
  source: "cli",
  extensions: [{ extension_id: "GitHub.copilot", version: "1.388.0", registry: "vs-marketplace" }],
};

describe("team inventory API", () => {
  beforeEach(() => {
    mocks.authenticated.mockReset().mockResolvedValue({ user: { id: "analyst-1" } });
    mocks.role.mockReset().mockResolvedValue("analyst");
    mocks.from.mockReset();
    mocks.rpc.mockReset().mockResolvedValue({ data: { device_id: "device-1", import_id: "import-1", extension_count: 1 }, error: null });
  });

  it("imports a validated snapshot through the transactional database function", async () => {
    const response = await POST(new Request("http://localhost", { method: "POST", body: JSON.stringify(valid) }), context);
    expect(response.status).toBe(201);
    expect(mocks.role).toHaveBeenCalledWith("team-1", "analyst-1", ["owner", "admin", "analyst"]);
    expect(mocks.rpc).toHaveBeenCalledWith("replace_team_inventory_snapshot", expect.objectContaining({
      target_team: "team-1",
      device_external_id: "laptop-1",
      extensions: valid.extensions,
    }));
  });

  it("rejects malformed input before calling the database", async () => {
    const response = await POST(new Request("http://localhost", { method: "POST", body: JSON.stringify({ ...valid, extensions: [{ extension_id: "bad", version: "1" }] }) }), context);
    expect(response.status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("does not allow a viewer to import inventory", async () => {
    mocks.role.mockRejectedValue(new TeamAuthorizationError());
    const response = await POST(new Request("http://localhost", { method: "POST", body: JSON.stringify(valid) }), context);
    expect(response.status).toBe(403);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("classifies exact installed versions against scans and monitoring", async () => {
    const result = (data: unknown) => ({ data, error: null });
    mocks.from.mockImplementation((table: string) => {
      if (table === "team_inventory_installations") return { select: () => ({ eq: () => ({ order: () => Promise.resolve(result([{ device_id: "device-1", extension_id: "GitHub.copilot", version: "1.388.0", registry: "vs-marketplace", reported_at: valid.reported_at }])) }) }) };
      if (table === "team_inventory_devices") return { select: () => ({ eq: () => ({ order: () => Promise.resolve(result([{ id: "device-1", display_name: "Laptop" }])) }) }) };
      if (table === "team_watchlist_items") return { select: () => ({ eq: () => Promise.resolve(result([{ extension_id: "GitHub.copilot", monitoring_state: "monitoring", baseline_version: "1.388.0" }])) }) };
      if (table === "team_inventory_imports") return { select: () => ({ eq: () => ({ order: () => ({ limit: () => ({ maybeSingle: () => Promise.resolve(result({ created_at: valid.reported_at })) }) }) }) }) };
      if (table === "extensions") return { select: () => ({ in: () => Promise.resolve(result([{ id: "GitHub.copilot", display_name: "GitHub Copilot", icon_url: null }])) }) };
      return { select: () => ({ in: () => ({ in: () => ({ eq: () => ({ order: () => Promise.resolve(result([{ id: "scan-1", extension_id: "GitHub.copilot", version: "1.388.0", decision: "review", severity: "HIGH", scanned_at: valid.reported_at }])) }) }) }) }) };
    });
    const response = await GET(new Request("http://localhost"), context);
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.summary).toMatchObject({ devices: 1, installations: 1, unique_extensions: 1, review_required: 1, monitored: 1 });
    expect(body.items[0]).toMatchObject({ display_name: "GitHub Copilot", status: "review_required", scan_id: "scan-1", monitored: true });
  });
});
