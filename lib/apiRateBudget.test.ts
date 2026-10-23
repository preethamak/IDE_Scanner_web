import { describe, expect, it } from "vitest";
import { bulkGateRateLimit } from "./apiRateBudget";

describe("bulk gate API rate budgets", () => {
  it("assigns a bounded default and larger enterprise budget", () => {
    expect(bulkGateRateLimit("team")).toBe(60);
    expect(bulkGateRateLimit("enterprise")).toBe(300);
  });
});
