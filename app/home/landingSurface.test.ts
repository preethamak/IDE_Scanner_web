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

  it("uses a full product-first hero with an announcement and live fog", () => {
    const hero = read("./HomeHero.tsx");
    const fog = read("./FogBackdrop.tsx");
    const css = read("./landing.module.css");
    expect(hero).toContain("Decision Receipts are live");
    expect(hero).toContain("Ship extensions with");
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
