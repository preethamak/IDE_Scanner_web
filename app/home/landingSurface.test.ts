import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const page = () => read("../page.tsx");
const landing = () => read("./AuthorityLanding.tsx");

describe("GuardRails landing surface", () => {
  it("composes the homepage from focused product sections", () => {
    expect(page()).toContain("<AuthorityLanding />");
    expect(landing()).toContain("<ReleaseReviewFilm />");
    expect(landing()).toContain("<DecisionMemoryFilm />");
    expect(landing()).not.toContain("<SecurityBento />");
    expect(landing()).not.toContain("<ReleaseWorkflow />");
  });
  it("attaches decisions durably to an exact release", () => {
    expect(landing()).toContain("DecisionMemoryFilm");
    const memory = read("./DecisionMemoryFilm.tsx");
    expect(memory).toContain("Approved with context");
    expect(memory).toContain("Decision attached to this exact release");
    expect(memory).toContain("brings forward the last decision");
  });

  it("uses a full product-first hero with an announcement and live fog", () => {
    const hero = read("./HomeHero.tsx");
    const fog = read("./FogBackdrop.tsx");
    const css = read("./landing.module.css");
    expect(hero).toContain("Decision Receipts");
    expect(hero).toContain("Vyper Guard");
    expect(hero).toContain("/extensions/vyper-guard.png");
    expect(hero).not.toContain("Cline");
    expect(hero).toContain("Review every");
    expect(hero).toContain("One review queue across your editors.");
    expect(hero).toContain("VS Code");
    expect(hero).toContain("Cursor");
    expect(hero).toContain("Windsurf");
    expect(hero).toContain("not affiliated with or endorsed");
    expect(hero).not.toContain("148 extensions");
    expect(hero).not.toContain("5 editors");
    expect(hero).toContain("Capability changes");
    expect(hero).toContain("Export evidence");
    expect(hero).toContain("FogBackdrop");
    for (const setting of ["0xfc17ee", "0x0e00ff", "0x00e1ff", "0xffebeb", "blurFactor: 0.6", "speed: 1", "zoom: 1"]) {
      expect(fog).toContain(setting);
    }
    expect(css).toContain("/* Product-first hero");
    expect(css).toContain(".productStage");
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
    expect(landing()).toContain('href="/registry"');
    expect(landing()).not.toContain('href="/workspace"');
  });

  it("keeps search, evidence, comparison, and decision concepts in the product story", () => {
    const files = [read("./HomeHero.tsx"), read("./PermissionDiff.tsx")].join("\n");
    for (const phrase of [
      "Check before install",
      "Compare every update",
      "See the permission change",
      "Review before rollout",
    ]) {
      expect(files).toContain(phrase);
    }
  });
  it("shows the release change interaction on the landing page", () => {
    expect(landing()).toContain("ReleaseReviewFilm");
    const film = read("./ReleaseReviewFilm.tsx");
    expect(film).toContain("NEW CAPABILITY");
    expect(film).toContain("What changed");
    expect(film).toContain("Save decision");
  });
});
