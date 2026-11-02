import { beforeEach, describe, expect, it, vi } from "vitest";

const { authenticatedByApiKey, publicDb, lookupGateVerdict, isValidGateCheck } = vi.hoisted(() => ({
  authenticatedByApiKey: vi.fn(),
  publicDb: vi.fn(),
  lookupGateVerdict: vi.fn(),
  isValidGateCheck: vi.fn(() => true),
}));

vi.mock("@/lib/apiKeyAuth", () => ({ authenticatedByApiKey }));
vi.mock("@/lib/supabase", () => ({ publicDb }));
vi.mock("@/lib/gateLookup", () => ({ lookupGateVerdict, isValidGateCheck }));

import { POST } from "./route";

function request(checks: Array<{ extension: string; version: string }>) {
  return new Request("https://abscissa.dev/api/gate/bulk", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ checks }),
  });
}

describe("bulk gate reliability", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authenticatedByApiKey.mockResolvedValue({ teamId: "team-1" });
    publicDb.mockReturnValue({});
  });

  it("limits lookup fan-out while preserving input order", async () => {
    let active = 0;
    let peak = 0;
    lookupGateVerdict.mockImplementation(async (_db, check) => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 2));
      active -= 1;
      return { extension: check.extension, version: check.version, verdict: "pass" };
    });
    const checks = Array.from({ length: 17 }, (_, index) => ({ extension: `publisher.extension${index}`, version: "1.0.0" }));
    const response = await POST(request(checks));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(peak).toBeLessThanOrEqual(8);
    expect(body.results.map((item: { extension: string }) => item.extension)).toEqual(checks.map((item) => item.extension));
  });

  it("returns an explicit retryable error when a lookup backend fails", async () => {
    lookupGateVerdict.mockRejectedValue(new Error("database unavailable"));
    const response = await POST(request([{ extension: "publisher.extension", version: "1.0.0" }]));
    await expect(response.json()).resolves.toMatchObject({ error: expect.stringContaining("No policy result") });
    expect(response.status).toBe(502);
    expect(response.headers.get("retry-after")).toBe("30");
  });
});
