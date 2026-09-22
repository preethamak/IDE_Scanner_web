import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./export-public-registry.mjs", import.meta.url), "utf8");

describe("Supabase public registry export", () => {
  it("revalidates every exact active-release member before writing the mirror", () => {
    expect(source).toContain("activeRegistryRowMismatch");
    expect(source).toContain("expected_reports");
    expect(source).toContain("declares ${expectedReports} reports");
    expect(source).toContain("Active public release returned");
    expect(source).toContain("delete scan.canonical_report");
  });
});
