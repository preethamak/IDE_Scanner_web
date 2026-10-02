import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");

describe("release comparison surface", () => {
  it("frames comparison as an exact-release workflow", () => {
    expect(page).toContain("Release comparison");
    expect(page).toContain("Reviewed baseline");
    expect(page).toContain("Release to inspect");
    expect(page).toContain("Both exact releases need completed analysis");
  });

  it("keeps evidence links attached to both releases", () => {
    expect(page).toContain("Open exact evidence");
    expect(page).toContain("Same scanner baseline");
    expect(page).toContain("Not comparable yet");
  });
});
