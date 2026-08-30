import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
const styles = readFileSync(
  new URL("./research.module.css", import.meta.url),
  "utf8",
);

describe("research index surface", () => {
  it("states the editorial evidence boundary", () => {
    expect(page).toContain("decisions you can defend");
    expect(page).toContain("Exact artifact before reputation");
    expect(page).toContain("Evidence before interpretation");
    expect(page).toContain("Limitations beside every conclusion");
  });

  it("links research to reproducible benchmark evidence", () => {
    expect(page).toContain('href="/benchmark"');
    expect(page).toContain("No latest-version substitutions");
    expect(page).toContain('href="/registry"');
  });

  it("publishes the Solidity Pro case study as an attributed research note", () => {
    const research = readFileSync(new URL("../../lib/research.ts", import.meta.url), "utf8");
    expect(research).toContain('slug: "solidity-pro"');
    expect(research).toContain("wallet stealer behind the audit tool");
    expect(research).toContain("Yeeth Security");
  });

  it("uses a light responsive and motion-safe surface", () => {
    expect(styles).toContain("#dcecdf");
    expect(styles).toContain("#eef5e6");
    expect(styles).toContain("prefers-reduced-motion");
  });
});
