import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authenticated: vi.fn(),
  role: vi.fn(),
  workspace: vi.fn(),
  save: vi.fn(),
  scanProduct: vi.fn(),
  privateDb: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ authenticated: mocks.authenticated }));
vi.mock("@/lib/teams", () => ({ requireTeamRole: mocks.role }));
vi.mock("@/lib/teamApiError", () => ({ teamApiError: (_error: unknown, message: string) => ({ error: message, status: 500 }) }));
vi.mock("@/lib/supabase", () => ({ serviceDb: vi.fn() }));
vi.mock("@/lib/cloudflareDeepScan", () => ({ getCloudflareScanProduct: mocks.scanProduct }));
vi.mock("@/lib/cloudflarePrivate", () => ({ newId: vi.fn(() => "generated-id"), nowIso: vi.fn(() => "2026-10-01T00:00:00.000Z"), privateDb: mocks.privateDb }));
vi.mock("@/lib/cloudflareWorkspace", () => ({ getWorkspaceState: mocks.workspace, saveState: mocks.save }));

import { POST } from "./route";

const context = { params: Promise.resolve({ id: "team-1" }) };
const scan = {
  scan: {
    extension_id: "Publisher.Extension",
    version: "1.2.3",
    artifact_sha256: "a".repeat(64),
    analysis_status: "complete",
    coverage_percent: 100,
    capabilities: { network: true },
  },
};

describe("artifact trust ledger API", () => {
  beforeEach(() => {
    mocks.authenticated.mockReset().mockResolvedValue({ user: { id: "owner-1" }, provider: "cloudflare" });
    mocks.role.mockReset().mockResolvedValue("owner");
    mocks.save.mockReset().mockResolvedValue(undefined);
    mocks.scanProduct.mockReset().mockResolvedValue(scan);
    mocks.privateDb.mockReset().mockReturnValue({ prepare: () => ({ bind: () => ({ first: () => Promise.resolve({ extension_id: "Publisher.Extension", version: "1.2.3" }) }) }) });
  });

  it("derives approval identity from a complete scan and stores a capability baseline", async () => {
    mocks.workspace.mockResolvedValue({ trust_records: [], recall_events: [], alerts: [], audit: [], inventory: { installations: [] } });
    const response = await POST(new Request("http://localhost", { method: "POST", body: JSON.stringify({ action: "approve", scan_id: "scan-1", registry: "vs-marketplace", rationale: "Reviewed the exact release evidence." }) }), context);
    const body = await response.json();
    expect(response.status).toBe(201);
    expect(body.record).toMatchObject({ extension_id: "Publisher.Extension", version: "1.2.3", artifact_sha256: "a".repeat(64), scan_id: "scan-1", status: "approved" });
    expect(mocks.save).toHaveBeenCalled();
  });

  it("creates a recall with exact and version-only inventory impact", async () => {
    const record = { id: "record-1", extension_id: "Publisher.Extension", version: "1.2.3", registry: "vs-marketplace", artifact_sha256: "a".repeat(64), status: "approved", capability_snapshot: {} };
    const alerts: Array<Record<string, unknown>> = [];
    const state = {
      trust_records: [record], recall_events: [], alerts, audit: [],
      inventory: { installations: [
        { device_id: "device-a", extension_id: "Publisher.Extension", version: "1.2.3", artifact_sha256: "a".repeat(64) },
        { device_id: "device-b", extension_id: "Publisher.Extension", version: "1.2.3" },
        { device_id: "device-c", extension_id: "Publisher.Extension", version: "1.2.3", artifact_sha256: "b".repeat(64) },
      ] },
    };
    mocks.workspace.mockResolvedValue(state);
    const response = await POST(new Request("http://localhost", { method: "POST", body: JSON.stringify({ action: "recall", trust_record_id: "record-1", reason: "Independent advisory matched the exact artifact." }) }), context);
    const body = await response.json();
    expect(response.status).toBe(201);
    expect(body.impact).toMatchObject({ exact_matches: 1, version_only_matches: 1, affected_devices: ["device-a", "device-b"] });
    expect(state.trust_records[0].status).toBe("revoked");
    expect(state.alerts[0].kind).toBe("artifact_recalled");
  });
});
