import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ read: vi.fn() }));
vi.mock("@/lib/requestScanEvidence", () => ({ requestScanEvidence: async () => mocks.read }));
import { GET } from "./route";
const context = { params: Promise.resolve({ id: "publisher.extension" }) };
const request = () => new Request("https://example.test/compare?from=1.0.0&to=2.0.0");
const product = (version: string, files: string[] = []) => ({ scan: { id: `scan-${version}`, version, analysis_status: "complete", decision: "allow", coverage_percent: 100, scanner_build: "build", ruleset_version: "rules" }, files: files.map((path) => ({ path, sha256: "hash" })), findings: [], dependencies: [] });

describe("exact release comparison", () => {
  beforeEach(() => mocks.read.mockReset());
  it("compares authorized normalized evidence from both stores without legacy latest_scan_id rows", async () => {
    mocks.read.mockImplementation(async (_id, version) => product(version, version === "2.0.0" ? ["new.js"] : []));
    const response = await GET(request(), context);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(await response.json()).toMatchObject({ comparable: true, to: { scan_id: "scan-2.0.0", coverage_percent: 100 }, changes: { files: { added: [{ path: "new.js" }] } } });
  });
  it("keeps the completed side visible when the other release is missing", async () => {
    mocks.read.mockImplementation(async (_id, version) => version === "2.0.0" ? product(version) : null);
    expect(await (await GET(request(), context)).json()).toMatchObject({ comparable: false, missing: ["1.0.0"], to: { scan_id: "scan-2.0.0", decision: "allow", coverage_percent: 100 } });
  });
  it("pins a workspace decision to the requested immutable target scan", async () => {
    mocks.read.mockImplementation(async (_id, version, scanId) => ({ ...product(version), scan: { ...product(version).scan, id: scanId || `latest-${version}` } }));
    const response = await GET(new Request("https://example.test/compare?from=1.0.0&to=2.0.0&toScanId=decision-scan"), context);
    expect(mocks.read).toHaveBeenCalledWith("publisher.extension", "2.0.0", "decision-scan");
    expect(await response.json()).toMatchObject({ comparable: true, to: { scan_id: "decision-scan" } });
  });
  it("does not fall back to another scan if the requested immutable scan is unavailable", async () => {
    mocks.read.mockImplementation(async (_id, version, scanId) => scanId ? null : product(version));
    const response = await GET(new Request("https://example.test/compare?from=1.0.0&to=2.0.0&toScanId=unavailable"), context);
    expect(await response.json()).toMatchObject({ comparable: false, missing: ["2.0.0"], to: { findings: null, files: null } });
  });
  it("does not compare incomplete scans", async () => {
    mocks.read.mockResolvedValue({ scan: { id: "incomplete", analysis_status: "partial" } });
    expect(await (await GET(request(), context)).json()).toMatchObject({ comparable: false, missing: ["1.0.0", "2.0.0"] });
  });
  it("rejects identical releases before reading evidence", async () => {
    expect((await GET(new Request("https://example.test/compare?from=1&to=1"), context)).status).toBe(400);
    expect(mocks.read).not.toHaveBeenCalled();
  });
});
