import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");

describe("GuardRails landing surface", () => {
  it("composes the homepage from focused product sections", () => {
    const page = read("../page.tsx");
    expect(page).toContain("<HomeHero />");
    expect(page).toContain("<MarketplaceProof />");
    expect(page).toContain("<PermissionDiff />");
    expect(page).toContain("<DecisionReceipt />");
    expect(page).not.toContain("<SecurityBento />");
    expect(page).not.toContain("<ReleaseWorkflow />");
  });
  it("introduces decision receipts as a distinctive, durable product outcome", () => {
    const page = read("../page.tsx");
    const receipt = read("./DecisionReceipt.tsx");
    expect(page).toContain("DecisionReceipt");
    expect(receipt).toContain("A GuardRails original");
    expect(receipt).toContain("Turn every approval into a decision receipt.");
    expect(receipt).toContain("Human rationale beside machine evidence");
    expect(receipt).toContain("Baseline locked");
  });

  it("uses a restrained product-first hero without a colored background effect", () => {
    const hero = read("./HomeHero.tsx");
    const css = read("./landing.module.css");
    expect(hero).toContain("Decision Receipts");
    expect(hero).toContain("GitHub Copilot");
    expect(hero).toContain("GITHUB.COPILOT");
    expect(hero).toContain("Microsoft.VisualStudio.Services.Icons.Default");
    expect(hero).not.toContain("vyperguard.vyper-guard");
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
    expect(hero).not.toContain("FogBackdrop");
    expect(css).toContain("/* Quiet neutral hero");
    expect(css).toContain("#7b284f");
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
    const page = read("../page.tsx");
    expect(page).toContain('href="/registry"');
    expect(page).toContain('href="/ide"');
    expect(page).not.toContain('href="/workspace"');
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
  it("includes the interactive permission diff signature", () => {
    const page = read("../page.tsx");
    expect(page).toContain("PermissionDiff");
    const diff = read("./PermissionDiff.tsx");
    expect(diff).toContain("See the permission change");
    expect(diff).toContain("Review before rollout");
    expect(diff).toContain('aria-label="Choose release"');
  });
});
