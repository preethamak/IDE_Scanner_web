import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function read(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

describe("public release-evidence documentation", () => {
  it("connects artifact identity, install surface, coverage, decisions, and monitoring", () => {
    const page = read("./page.tsx");

    expect(page).toContain('id="release-evidence"');
    expect(page).toContain("artifact hash");
    expect(page).toContain("extension packs and extension dependencies");
    expect(page).toContain("Incomplete coverage is a disclosed limitation");
    expect(page).toContain("Record the decision");
    expect(page).toContain("Monitor the baseline");
    expect(page).toContain("vsix-audit");
    expect(page).toContain("complementary controls");
  });
});
