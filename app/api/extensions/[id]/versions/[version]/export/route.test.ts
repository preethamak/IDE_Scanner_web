import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getVersionProduct: vi.fn() }));
vi.mock("@/lib/productData", () => ({ getVersionProduct: mocks.getVersionProduct }));

import { GET } from "@/app/api/extensions/[id]/versions/[version]/export/route";

describe("public evidence export", () => {
  it("exports stable public evidence without source previews or internal scan fields", async () => {
    mocks.getVersionProduct.mockResolvedValue({
      scan: {
        id: "scan-1", extension_id: "publisher.extension", version: "1.2.3", artifact_sha256: "a".repeat(64), analysis_status: "complete", decision: "review", public_outcome: "investigate", private_notes: "must never export", source_preview: "secret source",
      },
      findings: [{ rule_id: "network" }], capabilities: [], dependencies: [],
    });

    const response = await GET(new Request("https://example.test/export"), { params: Promise.resolve({ id: "publisher.extension", version: "1.2.3" }) });
    expect(response.status).toBe(200);
    expect(response.headers.get("content-disposition")).toBe('attachment; filename="guardrails-publisher.extension-1.2.3-evidence.json"');
    const payload = await response.json();
    expect(payload.identity).toMatchObject({ id: "scan-1", artifact_sha256: "a".repeat(64) });
    expect(payload).not.toHaveProperty("private_notes");
    expect(payload).not.toHaveProperty("source_preview");
    expect(JSON.stringify(payload)).not.toContain("must never export");
    expect(JSON.stringify(payload)).not.toContain("secret source");
  });

  it("does not fabricate an export for an incomplete public report", async () => {
    mocks.getVersionProduct.mockResolvedValue({ scan: { analysis_status: "incomplete" } });
    const response = await GET(new Request("https://example.test/export"), { params: Promise.resolve({ id: "publisher.extension", version: "1.2.3" }) });
    expect(response.status).toBe(404);
  });
});
