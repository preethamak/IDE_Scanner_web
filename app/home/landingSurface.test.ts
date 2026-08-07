import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");

describe("GuardRails landing surface", () => {
  it("composes the homepage from focused product sections", () => {
    const page = read("../page.tsx");
    expect(page).toContain("<HomeHero />");
    expect(page).toContain("<MarketplaceProof />");
    expect(page).toContain("<SecurityBento />");
    expect(page).toContain("<ReleaseWorkflow />");
  });

  it("uses a light, signal-led hero instead of the old dark product mockup", () => {
    const hero = read("./HomeHero.tsx");
    const css = read("./landing.module.css");
    expect(hero).toContain("The update is small.");
    expect(hero).toContain("Two new powers appeared in this update.");
    expect(hero).toContain("GuardRails release review");
    expect(css).toContain("/* Light signal-led hero */");
    expect(css).toContain(".heroAtmosphere");
    expect(css).toContain("Warm, daylight homepage palette");
    expect(css).not.toContain("#2f6fdd");
    expect(css).not.toContain("release-control-room-hero.png");
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
    const files = [
      read("./HomeHero.tsx"),
      read("./SecurityBento.tsx"),
      read("./ReleaseWorkflow.tsx"),
    ].join("\n");
    for (const phrase of [
      "Check before install",
      "Compare every update",
      "Release diff",
      "Make the team decision",
    ]) {
      expect(files).toContain(phrase);
    }
  });
  it("includes the interactive permission diff signature", () => {
    const page = read("../page.tsx");
    expect(page).toContain("PermissionDiff");
    const diff = read("./PermissionDiff.tsx");
    expect(diff).toContain("See the permission change");
    expect(diff).toContain("Review before rollout");
    expect(diff).toContain('aria-label="Choose release"');
  });
});
