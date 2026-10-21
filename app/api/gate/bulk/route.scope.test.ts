import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ authenticatedByApiKey: vi.fn() }));

vi.mock("@/lib/apiKeyAuth", () => ({ authenticatedByApiKey: mocks.authenticatedByApiKey }));
vi.mock("@/lib/gateLookup", () => ({
  isValidGateCheck: vi.fn(() => false),
  lookupGateVerdict: vi.fn(),
}));
vi.mock("@/lib/supabase", () => ({ publicDb: vi.fn() }));

import { POST } from "./route";

describe("POST /api/gate/bulk scopes", () => {
  beforeEach(() => {
    mocks.authenticatedByApiKey.mockResolvedValue({ teamId: "team-1", keyId: "key-1", scopes: ["gate:read"] });
  });

  it("requires the bulk-gate scope before evaluating a request", async () => {
    const response = await POST(new Request("https://guardrails.example/api/gate/bulk", {
      method: "POST",
      body: JSON.stringify({ checks: [{ extension: "not-a-valid-id", version: "1.0.0" }] }),
    }));

    expect(mocks.authenticatedByApiKey).toHaveBeenCalledWith(expect.any(Request), { requiredScopes: ["gate:read"] });
    expect(response.status).toBe(400);
  });
});
