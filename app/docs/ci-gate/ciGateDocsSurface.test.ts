import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("CI gate documentation", () => {
  it("documents a SHA-pinned exact-release action and honest failure boundary", () => {
    const page = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
    expect(page).toContain("@<reviewed-commit-sha>");
    expect(page).toContain("fail-on: unreviewed");
    expect(page).toContain("coverage-percent");
    expect(page).toContain("A failed job is deliberately not a malware claim.");
    expect(page).toContain("Do not switch to a different release merely to make the gate pass.");
  });
});
