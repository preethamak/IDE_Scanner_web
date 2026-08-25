import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");
describe("pricing and solution surfaces", () => {
  it("keeps scanning free and routes deeper help to early access, without invented prices", () => {
    const pricing = read("./pricing/page.tsx");
    expect(pricing).toContain('price: "$0"');
    expect(pricing).toContain("mailto:hello@abscissa.dev");
    expect(pricing).toContain("/design-partners");
    expect(pricing).not.toMatch(/price: "\$[1-9]/);
    expect(pricing).not.toContain("$19");
    expect(pricing).not.toContain("$9");
    expect(pricing).toContain("Compare every detail");
    expect(pricing.toLowerCase()).toContain("audience:");
    expect(pricing.toLowerCase()).not.toContain("buy now");
    expect(pricing.toLowerCase()).not.toContain("checkout");
    expect(pricing).not.toContain("₹");
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
