import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");
describe("pricing and solution surfaces", () => {
  it("does not present unfinished billing as available", () => {
    const pricing = read("./pricing/page.tsx");
    expect(pricing).toContain('"Early access"');
    expect(pricing).toContain('"Design partner"');
    expect(pricing).toContain("Discuss your requirements");
    expect(pricing.toLowerCase()).not.toContain("buy now");
    expect(pricing.toLowerCase()).not.toContain("checkout");
  });
  it("defines the four role-specific solution journeys", () => {
    const data = read("./solutions/data.ts");
    for (const phrase of [
      "For developers",
      "For engineering teams",
      "For security teams",
      "For AI-agent security",
    ])
      expect(data).toContain(phrase);
  });
  it("uses warm light marketing colors instead of dominant blue", () => {
    const css = read("./marketing.module.css");
    expect(css).toContain("#f5dce6");
    expect(css).toContain("#eef7cf");
    expect(css).not.toContain("#2f6fdd");
  });
});
