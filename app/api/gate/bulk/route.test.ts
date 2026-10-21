import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authenticatedByApiKey: vi.fn(),
  consumeBulkGateBudget: vi.fn(),
  publicDb: vi.fn(),
  lookupGateVerdict: vi.fn(),
}));

vi.mock("@/lib/apiKeyAuth", () => ({ authenticatedByApiKey: mocks.authenticatedByApiKey }));
vi.mock("@/lib/apiRateBudget", () => ({ consumeBulkGateBudget: mocks.consumeBulkGateBudget }));
vi.mock("@/lib/supabase", () => ({ publicDb: mocks.publicDb }));
vi.mock("@/lib/gateLookup", () => ({
  isValidGateCheck: () => true,
  lookupGateVerdict: mocks.lookupGateVerdict,
}));

import { POST } from "./route";

function request(body: unknown) {
  return new Request("https://abscissa.dev/api/gate/bulk", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: "Bearer gr_test" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/gate/bulk rate budget", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.authenticatedByApiKey.mockResolvedValue({ teamId: "team-1", keyId: "key-1", plan: "team" });
  });

  it("rejects an exhausted key before touching the analysis backend", async () => {
    mocks.consumeBulkGateBudget.mockResolvedValue({ allowed: false, remaining: 0, retryAfter: 27 });

    const response = await POST(request({ checks: [{ extension: "publisher.extension", version: "1.0.0" }] }));

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("27");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    await expect(response.json()).resolves.toMatchObject({ code: "RATE_LIMITED" });
    expect(mocks.publicDb).not.toHaveBeenCalled();
    expect(mocks.lookupGateVerdict).not.toHaveBeenCalled();
  });

  it("fails closed when the shared budget cannot be read", async () => {
    mocks.consumeBulkGateBudget.mockRejectedValue(new Error("database unavailable"));

    const response = await POST(request({ checks: [{ extension: "publisher.extension", version: "1.0.0" }] }));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ error: "Bulk gate rate budget is temporarily unavailable." });
    expect(mocks.publicDb).not.toHaveBeenCalled();
  });
});
