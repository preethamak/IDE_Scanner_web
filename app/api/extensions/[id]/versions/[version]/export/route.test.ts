import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ read: vi.fn() }));
vi.mock("@/lib/requestScanEvidence", () => ({ requestScanEvidence: async () => mocks.read }));
import { GET } from "./route";
const context = { params: Promise.resolve({ id: "publisher.extension", version: "1.0.0" }) };
describe("immutable evidence exports", () => {
  beforeEach(() => mocks.read.mockReset());
  it("exports the scan requested by the report, including normalized evidence", async () => {
    mocks.read.mockResolvedValue({ scan: { id: "owned-scan", version: "1.0.0", analysis_status: "complete", artifact_sha256: "a".repeat(64) }, findings: [{ rule_id: "rule" }], dependencies: [{ name: "dep" }] });
    const response = await GET(new Request("https://example.test/export?scanId=owned-scan"), context);
    expect(mocks.read).toHaveBeenCalledWith("publisher.extension", "1.0.0", "owned-scan");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-disposition")).toContain("attachment;");
    expect(response.headers.get("cache-control")).toContain("private");
    expect(await response.json()).toMatchObject({ identity: { id: "owned-scan" }, findings: [{ rule_id: "rule" }], dependencies: [{ name: "dep" }] });
  });
  it.each([null, { scan: { id: "partial", analysis_status: "partial" } }])("refuses missing, unauthorized, or incomplete evidence", async (product) => {
    mocks.read.mockResolvedValue(product);
    expect((await GET(new Request("https://example.test/export?scanId=unavailable"), context)).status).toBe(404);
  });
  it("preserves the public version-only export and excludes internal scan fields", async () => {
    mocks.read.mockResolvedValue({ scan: { id: "public-scan", analysis_status: "complete", private_notes: "must never export", source_preview: "secret source" }, findings: [{ rule_id: "network" }], dependencies: [] });
    const response = await GET(new Request("https://example.test/export"), context);
    expect(mocks.read).toHaveBeenCalledWith("publisher.extension", "1.0.0", undefined);
    expect(response.headers.get("content-disposition")).toBe('attachment; filename="guardrails-publisher.extension-1.0.0-evidence.json"');
    const text = await response.text();
    expect(text).not.toContain("must never export");
    expect(text).not.toContain("secret source");
  });
});
