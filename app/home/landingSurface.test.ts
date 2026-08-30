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

  it("keeps marketplace proof points visible", () => {
    const proof = read("./MarketplaceProof.tsx");
    expect(proof).toContain('value: "~60,000"');
    expect(proof).toContain('value: "~1,800"');
    expect(proof).toContain('value: "3.3B"');
    // The block is labelled "Public industry figures", so every tile must be
    // checkable against a cited source. The self-reported "4x detection
    // growth" number had none and was removed rather than relabelled.
    expect(proof).not.toContain('value: "4×"');
  });

  it("leads visitors to public working surfaces rather than making workspace the primary CTA", () => {
    expect(landing()).toContain('href="/registry"');
    expect(landing()).not.toContain('href="/workspace"');
  });

  it("shows the release change interaction on the landing page", () => {
    expect(landing()).toContain("ReleaseReviewFilm");
    const film = read("./ReleaseReviewFilm.tsx");
    expect(film).toContain("NEW CAPABILITY");
    expect(film).toContain("What changed");
    expect(film).toContain("Save decision");
  });
});
