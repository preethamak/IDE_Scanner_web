import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./build-publication-validation.mjs", import.meta.url), "utf8");

describe("Supabase publication validation boundary", () => {
  it("validates the generated manifest before writing it", () => {
    expect(source).toContain('from "./publication-manifest.mjs"');
    expect(source).toContain('from "./publication-canonical.mjs"');
    expect(source).toContain("publicCanonicalMismatch");
    expect(source).toContain("validatePublicationManifest(validation.extensions, { requireScanId: false });");
    expect(source).toContain("max_safe_review_rate: accuracyGate.holdout.max_safe_review_rate ?? 0.2");
  });
});
