import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

describe("GuardRails landing surface", () => {
  it("composes the homepage from focused product sections", () => {
    const page = read("../page.tsx");
    expect(page).toContain("<HomeHero />");
    expect(page).toContain("<MarketplaceProof />");
    expect(page).toContain("<SecurityBento />");
    expect(page).toContain("<ReleaseWorkflow />");
  });

  it("keeps marketplace proof points visible", () => {
    const proof = read("./MarketplaceProof.tsx");
    expect(proof).toContain('value: "~60,000"');
    expect(proof).toContain('value: "~1,800"');
    expect(proof).toContain('value: "3.3B"');
    expect(proof).toContain('value: "4×"');
  });

  it("leads visitors to public working surfaces rather than making workspace the primary CTA", () => {
    const page = read("../page.tsx");
    expect(page).toContain('href="/registry"');
    expect(page).toContain('href="/ide"');
    expect(page).not.toContain('href="/workspace"');
  });

  it("keeps search, evidence, comparison, and decision concepts in the product story", () => {
    const files = [read("./HomeHero.tsx"), read("./SecurityBento.tsx"), read("./ReleaseWorkflow.tsx")].join("\n");
    for (const phrase of ["Exact-version reports", "Evidence-first decisions", "Release diff", "Record the decision"]) {
      expect(files).toContain(phrase);
    }
  });
});
