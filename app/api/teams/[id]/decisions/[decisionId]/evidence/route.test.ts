import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), role: vi.fn(), state: vi.fn(), scan: vi.fn(), publicScan: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authenticated: mocks.auth, AuthenticationError: class extends Error {} }));
vi.mock("@/lib/teams", () => ({ requireTeamRole: mocks.role }));
vi.mock("@/lib/cloudflareWorkspace", () => ({ getWorkspaceState: mocks.state }));
vi.mock("@/lib/cloudflareDeepScan", () => ({ getCloudflareScanProduct: mocks.scan }));
vi.mock("@/lib/productData", () => ({ getVersionScanProduct: mocks.publicScan }));
import { GET } from "./route";
import { buildPermissionPassport } from "@/lib/permissionPassport";
const context = { params: Promise.resolve({ id: "team-1", decisionId: "decision-1" }) };
const request = new Request("https://example.test/evidence?scanId=unrelated-private-scan");

describe("workspace decision evidence", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.auth.mockResolvedValue({ user: { id: "viewer" }, provider: "cloudflare" });
    mocks.role.mockResolvedValue("viewer");
    mocks.state.mockResolvedValue({ decisions: [{ id: "decision-1", scan_id: "saved-scan", extension_id: "publisher.extension", version: "1.0.0" }] });
    mocks.scan.mockResolvedValue({ scan: { id: "saved-scan", analysis_status: "complete", capabilities: { filesystem: true, process_execution: true }, artifact_sha256: "a".repeat(64), manifest: { private: true } } });
    mocks.publicScan.mockResolvedValue(null);
  });
  it("returns permissions for the saved scan, including an ID the passport needs", async () => {
    const response = await GET(request, context);
    expect(response.status).toBe(200);
    expect(mocks.scan).toHaveBeenCalledWith("publisher.extension", "1.0.0", "saved-scan");
    const { scan } = await response.json();
    expect(scan.manifest).toBeUndefined();
    const passport = buildPermissionPassport({ extensionId: "publisher.extension", version: "1.0.0", scan });
    expect(passport.freshness).toBe("current");
    expect(passport.categories.find((item) => item.id === "files")?.state).toBe("observed");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });
  it("checks membership before reading the workspace or private report", async () => {
    mocks.role.mockRejectedValue(new Error("Forbidden"));
    expect((await GET(request, context)).status).toBeGreaterThanOrEqual(400);
    expect(mocks.state).not.toHaveBeenCalled();
    expect(mocks.scan).not.toHaveBeenCalled();
  });
  it("refuses a decision belonging to another workspace", async () => {
    mocks.state.mockResolvedValue({ decisions: [] });
    expect((await GET(request, context)).status).toBe(404);
    expect(mocks.scan).not.toHaveBeenCalled();
  });
  it("falls back to the exact published snapshot for legacy reports", async () => {
    mocks.scan.mockResolvedValue(null);
    mocks.publicScan.mockResolvedValue({ scan: { id: "saved-scan", analysis_status: "complete" } });
    expect((await GET(request, context)).status).toBe(200);
    expect(mocks.publicScan).toHaveBeenCalledWith("publisher.extension", "1.0.0", "saved-scan", undefined, { skipCloudflareCatalog: true });
  });
  it("returns an error when evidence is missing rather than an unscanned passport", async () => {
    mocks.scan.mockResolvedValue(null);
    expect((await GET(request, context)).status).toBe(404);
  });
});
