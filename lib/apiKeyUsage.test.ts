import { describe, expect, it } from "vitest";
import { apiKeyUsageRecord } from "@/lib/apiKeyUsage";

describe("apiKeyUsageRecord", () => {
  it("keeps only path and method, never request query or bearer material", () => {
    const record = apiKeyUsageRecord({
      teamId: "team-1",
      keyId: "key-1",
      request: new Request("https://abscissa.dev/api/gate/bulk?token=must-not-persist", { method: "post", headers: { Authorization: "Bearer grk_live_secret" } }),
    });
    expect(record).toEqual({ team_id: "team-1", key_id: "key-1", method: "POST", endpoint: "/api/gate/bulk" });
    expect(JSON.stringify(record)).not.toContain("secret");
  });
});
