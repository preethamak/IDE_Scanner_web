import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");
describe("pricing and solution surfaces", () => {
  it("keeps scanning free and quotes future prices only as future prices", () => {
    const pricing = read("./pricing/page.tsx");
    expect(pricing).toContain('price: "$0"');
    // Billing is off, so a paid tier may never advertise a chargeable price in
    // `price`; the published number lives in `later` as a future commitment.
    expect(pricing).toContain('later: "$19/month when billing opens"');
    expect(pricing).toContain(
      'later: "$99/month up to 25 seats when billing opens"',
    );
    expect(pricing).not.toContain('price: "$19"');
    expect(pricing).not.toContain('price: "$99"');
    expect(pricing.toLowerCase()).toContain("no payment is possible yet");
    // Paid interest routes to the wired design-partner form, not a mailto.
    expect(pricing).not.toContain("mailto:");
    expect(pricing).toContain("/design-partners");
    expect(pricing.toLowerCase()).toContain("money-back");
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
  it("renders marketing and trust surfaces in one accent hue", () => {
    const css = read("./marketing.module.css");
    const trust = read("./trust.module.css");
    // The accent is the brand green, referenced through the token so the
    // cascade cannot fork it back into a second hue.
    expect(css).toContain("var(--ledger-signal)");
    expect(trust).toContain("var(--ledger-signal)");
    // Retired palettes: dominant blue, plum, and the violet/peach pass.
    for (const hex of ["#2f6fdd", "#9a496d", "#7658d8", "#f17e69", "#e4d8ff"]) {
      expect(css.toLowerCase()).not.toContain(hex);
      expect(trust.toLowerCase()).not.toContain(hex);
    }
  });
});
