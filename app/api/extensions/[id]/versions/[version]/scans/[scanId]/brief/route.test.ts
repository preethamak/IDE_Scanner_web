import { describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/extensions/[id]/versions/[version]/scans/[scanId]/brief/route";
import { getVersionScanProduct } from "@/lib/productData";
import { serverDb } from "@/lib/supabaseServer";
import { createEvidenceReviewBrief } from "@/lib/sarvam";

vi.mock("@/lib/productData", () => ({ getVersionScanProduct: vi.fn() }));
vi.mock("@/lib/supabaseServer", () => ({ serverDb: vi.fn() }));
vi.mock("@/lib/sarvam", () => ({
  createEvidenceReviewBrief: vi.fn(),
  SarvamConfigurationError: class SarvamConfigurationError extends Error {},
  SarvamProviderError: class SarvamProviderError extends Error { status = 502; },
  SarvamOutputError: class SarvamOutputError extends Error {},
}));

const mockedProduct = vi.mocked(getVersionScanProduct);
const mockedServerDb = vi.mocked(serverDb);
const mockedBrief = vi.mocked(createEvidenceReviewBrief);

describe("evidence brief route", () => {
  it("requires authentication before spending Sarvam credits", async () => {
    mockedServerDb.mockResolvedValue({ auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) } } as never);
    const response = await POST(new Request("http://localhost/api/brief", { method: "POST", headers: { Origin: "http://localhost" } }), { params: Promise.resolve({ id: "publisher.extension", version: "1.2.3", scanId: "scan-1" }) });
    expect(response.status).toBe(401);
    expect(mockedBrief).not.toHaveBeenCalled();
  });

  it("rejects cross-origin cookie requests", async () => {
    mockedServerDb.mockResolvedValue({ auth: { getUser: vi.fn() } } as never);
    const response = await POST(new Request("http://localhost/api/brief", { method: "POST", headers: { Origin: "https://attacker.example" } }), { params: Promise.resolve({ id: "publisher.extension", version: "1.2.3", scanId: "scan-3" }) });
    expect(response.status).toBe(403);
    expect(mockedServerDb).not.toHaveBeenCalled();
  });

  it("binds generation to the requested exact report and never accepts client report content", async () => {
    mockedServerDb.mockResolvedValue({ auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }) } } as never);
    mockedProduct.mockResolvedValue({
      scan: { id: "scan-1", extension_id: "publisher.extension", version: "1.2.3", artifact_sha256: "a".repeat(64), analysis_status: "complete", decision: "review" },
      findings: [{ rule_id: "network-egress", summary: "Outbound request" }],
      dependencies: [],
    } as never);
    mockedBrief.mockResolvedValue({
      model: "sarvam-105b",
      brief: { headline: "Review the network evidence", what_changed: [], why_it_matters: [], verify_next: [], uncertainties: [], evidence_refs: ["finding-1"] },
    });

    const response = await POST(new Request("http://localhost/api/brief", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "http://localhost" },
      body: JSON.stringify({ audience: "engineer", report: { fake: "client-controlled" } }),
    }), { params: Promise.resolve({ id: "publisher.extension", version: "1.2.3", scanId: "scan-1" }) });
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.identity).toMatchObject({ extension_id: "publisher.extension", version: "1.2.3", scan_id: "scan-1" });
    expect(body.deterministic_decision).toBe("review");
    expect(body.report).toBeUndefined();
    expect(mockedBrief).toHaveBeenCalledWith(expect.objectContaining({ scanId: "scan-1" }), "engineer");
  });

  it("rejects an accessible but mismatched scan identity", async () => {
    mockedServerDb.mockResolvedValue({ auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-2" } } }) } } as never);
    mockedProduct.mockResolvedValue({ scan: { id: "other-scan", extension_id: "publisher.extension", version: "1.2.3" } } as never);
    const response = await POST(new Request("http://localhost/api/brief", { method: "POST", headers: { Origin: "http://localhost" } }), { params: Promise.resolve({ id: "publisher.extension", version: "1.2.3", scanId: "scan-2" }) });
    expect(response.status).toBe(404);
    expect(mockedBrief).not.toHaveBeenCalled();
  });
});
