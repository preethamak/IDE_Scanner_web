import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), state: vi.fn(), save: vi.fn(), newId: vi.fn(), now: vi.fn() }));
vi.mock("@/lib/apiKeyAuth", () => ({ authenticatedByApiKey: mocks.auth }));
vi.mock("@/lib/cloudflareWorkspace", () => ({ getWorkspaceState: mocks.state, saveState: mocks.save }));
vi.mock("@/lib/cloudflarePrivate", () => ({ newId: mocks.newId, nowIso: mocks.now }));

import { POST } from "./route";
import { collectorSnapshotFingerprint, parseCollectorSnapshot } from "@/lib/capabilityCollector";

const body = { inventory: { device: { id: "laptop-1", name: "Developer laptop", platform: "linux" }, reported_at: "2026-10-21T10:00:00.000Z", extensions: [{ extension_id: "GitHub.copilot", version: "1.2.3", registry: "vs-marketplace", artifact_sha256: null }] }, graph: { subjects: [{ id: "mcp_server:github", kind: "mcp_server", name: "GitHub MCP", version: "1", publisher: "GitHub", artifactSha256: null, evidenceState: "observed", observedAt: "2026-10-21T10:00:00.000Z", capabilities: ["network"], source: "collector" }], relationships: [] } };

describe("capability collector API", () => {
  beforeEach(() => {
    mocks.auth.mockReset().mockResolvedValue({ teamId: "team-from-key", keyId: "key-1", provider: "cloudflare", scopes: ["collector:write"] });
    mocks.state.mockReset().mockResolvedValue({ inventory: { devices: [], installations: [], last_import_at: null }, capability_graph: null, audit: [] });
    mocks.save.mockReset().mockResolvedValue(undefined);
    mocks.newId.mockReset().mockReturnValueOnce("event-1").mockReturnValueOnce("receipt-1");
    mocks.now.mockReset().mockReturnValue("2026-10-21T10:01:00.000Z");
  });

  it("binds the snapshot to the API key workspace and saves an auditable receipt", async () => {
    const response = await POST(new Request("http://localhost/api/collector/capabilities", { method: "POST", body: JSON.stringify(body) }));
    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toMatchObject({ accepted: true, workspace_id: "team-from-key", device_id: "laptop-1" });
    expect(mocks.auth).toHaveBeenCalledWith(expect.any(Request), "collector:write");
    expect(mocks.save.mock.calls[0][0]).toBe("team-from-key");
    expect(mocks.save.mock.calls[0][1].audit[0]).toMatchObject({ action: "collector_snapshot_ingested", actor_id: "api_key:key-1" });
  });

  it("does not allow a compatibility-provider key to write Cloudflare state", async () => {
    mocks.auth.mockResolvedValue({ teamId: "team-1", keyId: "key-1", provider: "supabase", scopes: ["collector:write"] });
    const response = await POST(new Request("http://localhost", { method: "POST", body: JSON.stringify(body) }));
    expect(response.status).toBe(503);
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it("rejects invalid collector payloads before persistence", async () => {
    const response = await POST(new Request("http://localhost", { method: "POST", body: JSON.stringify({}) }));
    expect(response.status).toBe(400);
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it("returns the original receipt for a retry and rejects key reuse with different content", async () => {
    const fingerprint = collectorSnapshotFingerprint(parseCollectorSnapshot(body, "team-from-key"));
    mocks.state.mockResolvedValue({ inventory: { devices: [], installations: [], last_import_at: null }, capability_graph: null, audit: [], collector_receipts: [{ key: "retry-key-000000", snapshot_sha256: fingerprint, receipt_id: "receipt-old", device_id: "laptop-1", reported_at: body.inventory.reported_at }] });
    const duplicate = await POST(new Request("http://localhost", { method: "POST", headers: { "Idempotency-Key": "retry-key-000000" }, body: JSON.stringify(body) }));
    await expect(duplicate.json()).resolves.toMatchObject({ accepted: true, duplicate: true, receipt_id: "receipt-old" });
    expect(mocks.save).not.toHaveBeenCalled();
    const conflict = await POST(new Request("http://localhost", { method: "POST", headers: { "Idempotency-Key": "retry-key-000000" }, body: JSON.stringify({ ...body, inventory: { ...body.inventory, extensions: [{ ...body.inventory.extensions[0], version: "9.9.9" }] } }) }));
    expect(conflict.status).toBe(409);
  });
});
