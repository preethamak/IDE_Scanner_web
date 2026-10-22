import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getVersionProduct: vi.fn() }));
vi.mock("@/lib/productData", () => ({ getVersionProduct: mocks.getVersionProduct }));

import { GET } from "./route";

describe("public SARIF release export", () => {
  it("exports only a completed exact release as SARIF", async () => {
    mocks.getVersionProduct.mockResolvedValue({
      scan: { id: "scan-1", analysis_status: "complete", artifact_sha256: "a".repeat(64) },
      findings: [{ rule_id: "network", severity: "HIGH", summary: "Network access" }],
    });
    const response = await GET(new Request("https://abscissa.dev/api/extensions/publisher.extension/versions/1.2.3/sarif"), { params: Promise.resolve({ id: "publisher.extension", version: "1.2.3" }) });
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/sarif+json");
    expect(response.headers.get("content-disposition")).toBe('attachment; filename="guardrails-publisher.extension-1.2.3.sarif"');
    expect((await response.json()).runs[0].properties.report_url).toContain("/extensions/publisher.extension/versions/1.2.3/scans/scan-1");
  });

  it("does not fabricate a SARIF document for an incomplete report", async () => {
    mocks.getVersionProduct.mockResolvedValue({ scan: { analysis_status: "incomplete" } });
    const response = await GET(new Request("https://abscissa.dev/api/extensions/publisher.extension/versions/1.2.3/sarif"), { params: Promise.resolve({ id: "publisher.extension", version: "1.2.3" }) });
    expect(response.status).toBe(404);
  });
});
