import { describe, expect, it } from "vitest";
import { defaultMarketplacePageCount, marketplacePagePolicy } from "./marketplace-pagination.mjs";

describe("Marketplace cohort pagination", () => {
  it.each([
    [1, 3],
    [250, 3],
    [1_000, 10],
    [10_000, 100],
    [25_000, 100],
  ])("sizes %s requested releases to %s pages", (requested, expected) => {
    expect(defaultMarketplacePageCount(requested)).toBe(expected);
  });

  it("keeps the source page and cohort bounds explicit", () => {
    expect(marketplacePagePolicy).toEqual({ pageSize: 100, maxPages: 100, maxCohortSize: 10_000 });
  });
});
