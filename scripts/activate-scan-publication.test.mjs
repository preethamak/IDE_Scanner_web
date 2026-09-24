import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./activate-scan-publication.mjs", import.meta.url), "utf8");

describe("Supabase publication activation boundary", () => {
  it("validates the manifest and supports the 10,000-report cohort limit", () => {
    expect(source).toContain('from "./publication-manifest.mjs"');
    expect(source).toContain("validatePublicationManifest(expected, { requireScanId: false })");
    expect(source).toContain(".limit(Math.max(5000, expected.length))");
    expect(source).toContain("score_schema_version: [scoreSchemaVersion, String(actual.score_schema_version || \"\")]");
    expect(source).toContain("does not use the validated score schema");
    expect(source).toContain("validatePublicationManifest(expected.map((item, index) => ({ ...item, scan_id: scanIds[index] })))");
  });
});
