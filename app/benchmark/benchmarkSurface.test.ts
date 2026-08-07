import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
const styles = readFileSync(
  new URL("./benchmark.module.css", import.meta.url),
  "utf8",
);

describe("public benchmark surface", () => {
  it("keeps publication tied to exact reproducible evidence", () => {
    expect(page).toContain("what it cannot prove");
    expect(page).toContain("No latest-version substitution");
    expect(page).toContain("No artifact-hash mismatch");
    expect(page).toContain("No incomplete analyzer coverage");
    expect(page).toContain("No evidence substitution");
  });

  it("preserves live corpus behavior and immutable report links", () => {
    expect(page).toContain("getReproducibleBenchmark");
    expect(page).toContain("immutableScanPath");
    expect(page).toContain("row.scan?.decision");
    expect(page).toContain("awaiting rerun");
  });

  it("uses a light responsive evidence table", () => {
    expect(styles).toContain("#dce9ff");
    expect(styles).toContain("#efffd2");
    expect(styles).toContain("overflow-x: auto");
    expect(styles).toContain("prefers-reduced-motion");
  });
});
