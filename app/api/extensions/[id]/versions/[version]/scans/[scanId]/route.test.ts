import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getVersionScanProduct: vi.fn(), reportAccessUser: vi.fn(), cloudflarePrivateAvailable: vi.fn(), db: { auth: {} } }));
vi.mock("@/lib/productData", () => ({ getVersionScanProduct: mocks.getVersionScanProduct }));
vi.mock("@/lib/supabaseServer", () => ({ serverDb: async () => mocks.db }));
vi.mock("@/lib/reportAccess", () => ({ reportAccessUser: mocks.reportAccessUser }));
vi.mock("@/lib/cloudflareDeepScan", () => ({ cloudflarePrivateAvailable: mocks.cloudflarePrivateAvailable }));
import { GET } from "./route";

describe("immutable extension scan endpoint", () => {
  beforeEach(() => {
    mocks.getVersionScanProduct.mockReset();
    mocks.reportAccessUser.mockResolvedValue({ id: "user-1" });
    mocks.cloudflarePrivateAvailable.mockReturnValue(false);
  });

  it("loads the exact decoded identity and scan id", async () => {
    mocks.getVersionScanProduct.mockResolvedValue({ scan: { id: "scan-1", artifact_sha256: "a".repeat(64) } });
    const response = await GET(new Request("http://localhost"), { params: Promise.resolve({ id: "publisher%2Eextension", version: "1%2E2%2E3", scanId: "scan-1" }) });
    expect(response.status).toBe(200);
    expect(mocks.getVersionScanProduct).toHaveBeenCalledWith("publisher.extension", "1.2.3", "scan-1", mocks.db, { skipCloudflareCatalog: true });
  });

  it("does not fall back to the latest scan", async () => {
    mocks.getVersionScanProduct.mockResolvedValue(null);
    const response = await GET(new Request("http://localhost"), { params: Promise.resolve({ id: "publisher.extension", version: "1.2.3", scanId: "missing" }) });
    expect(response.status).toBe(404);
  });

  it("does not expose the full report without an authenticated viewer", async () => {
    mocks.reportAccessUser.mockResolvedValue(null);
    const response = await GET(new Request("http://localhost"), { params: Promise.resolve({ id: "publisher.extension", version: "1.2.3", scanId: "scan-1" }) });
    expect(response.status).toBe(401);
    expect(mocks.getVersionScanProduct).not.toHaveBeenCalled();
  });
});
