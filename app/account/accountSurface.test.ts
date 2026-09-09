import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const page = fs.readFileSync(
  path.join(process.cwd(), "app/account/page.tsx"),
  "utf8",
);
const css = fs.readFileSync(
  path.join(process.cwd(), "app/account/account.css"),
  "utf8",
);

describe("GuardRails account surface", () => {
  it("keeps authentication behavior while presenting the product outcome", () => {
    expect(page).toContain("signInWithOAuth");
    expect(page).toContain("signInWithOtp");
    expect(page).toContain("verifyOtp");
    expect(page).toContain("Know what changed. Keep the decision.");
    expect(page).toContain("Your GuardRails workspace.");
  });

  it("uses a light atmospheric surface without dark-green treatments", () => {
    expect(css).toContain("#edf7f4");
    expect(css).toContain("#f4faf8");
    expect(css).toContain("#e1f3ef");
    expect(css).not.toContain("#173f2a");
    expect(css).not.toContain("#245d3e");
  });

  it("keeps all new visible text at twelve pixels or larger", () => {
    expect(css).not.toMatch(/font-size:\s*(?:[0-9]|10|11)px/);
  });

  it("reserves room for the fixed consent banner so auth controls stay reachable", () => {
    expect(css).toContain("padding: 76px 0 180px !important;");
    expect(css).toContain("padding-bottom: 240px !important;");
  });
});
