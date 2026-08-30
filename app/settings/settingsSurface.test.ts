import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
const styles = readFileSync(
  new URL("./settings.module.css", import.meta.url),
  "utf8",
);

describe("analysis boundaries surface", () => {
  it("documents all supported evidence paths", () => {
    expect(page).toContain("Deep Scan");
    expect(page).toContain("GuardRails CLI");
    expect(page).toContain("Report importer");
    expect(page).toContain("Workspace");
    expect(page).toContain("Runs in");
    expect(page).toContain("Receives");
    expect(page).toContain("Produces");
    expect(page).toContain("Retains");
  });

  it("keeps core interpretation rules visible", () => {
    expect(page).toContain("Preflight is not Deep Scan");
    expect(page).toContain("Identity is not safety");
    expect(page).toContain("Capability is not intent");
    expect(page).toContain("Incomplete is not allow");
  });

  it("uses a light responsive and reduced-motion design", () => {
    expect(styles).toContain("#dcecdf");
    expect(styles).toContain("#eef5e6");
    expect(styles).toContain("#efffcf");
    expect(styles).toContain("prefers-reduced-motion");
  });
});
