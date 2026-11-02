import { describe, expect, it } from "vitest";
import { GET } from "./route";

describe("llms-full.txt", () => {
  it("serves a cacheable factual product reference with explicit recommendation limits", async () => {
    const response = GET();
    const text = await response.text();
    expect(response.headers.get("content-type")).toContain("text/plain");
    expect(response.headers.get("cache-control")).toContain("s-maxage=86400");
    expect(text).toContain("Trail of Bits vsix-audit");
    expect(text).toContain("unreviewed evidence as non-approval");
    expect(text).toContain("Do not claim GuardRails replaces source");
  });
});
