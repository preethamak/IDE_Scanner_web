import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getVersionScanProduct: vi.fn() }));
vi.mock("@/lib/productData", () => ({
  getVersionScanProduct: mocks.getVersionScanProduct,
}));
import { GET } from "./route";

const context = {
  params: Promise.resolve({
    id: "publisher.extension",
    version: "1.2.3",
    scanId: "scan-1",
  }),
};

describe("immutable scan evidence export", () => {
  beforeEach(() => mocks.getVersionScanProduct.mockReset());

  it("exports only the requested terminal scan with immutable caching", async () => {
    mocks.getVersionScanProduct.mockResolvedValue({
      scan: {
        id: "scan-1",
        extension_id: "publisher.extension",
        version: "1.2.3",
        artifact_sha256: "a".repeat(64),
        analysis_status: "incomplete",
        decision: "review",
        internal_note: "never export",
      },
      findings: [{ rule_id: "network" }],
      files: [{ path: "extension.js", content: "never export source" }],
      dependencies: [],
    });
    const response = await GET(new Request("https://example.test"), context);
    expect(response.status).toBe(200);
    expect(mocks.getVersionScanProduct).toHaveBeenCalledWith(
      "publisher.extension",
      "1.2.3",
      "scan-1",
    );
    expect(response.headers.get("cache-control")).toBe(
      "public, max-age=31536000, immutable",
    );
    expect(response.headers.get("content-disposition")).toContain(
      "scan-1-evidence.json",
    );
    const payload = await response.json();
    expect(payload).toMatchObject({
      immutable_report: true,
      identity: { id: "scan-1" },
    });
    expect(JSON.stringify(payload)).not.toContain("internal_note");
    expect(JSON.stringify(payload)).not.toContain("never export source");
  });

  it("rejects non-terminal evidence", async () => {
    mocks.getVersionScanProduct.mockResolvedValue({
      scan: { id: "scan-1", analysis_status: "running" },
    });
    expect(
      (await GET(new Request("https://example.test"), context)).status,
    ).toBe(409);
  });
});
