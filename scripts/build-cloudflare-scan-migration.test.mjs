import { describe, expect, it } from "vitest";
import { buildSubsetSql } from "./build-cloudflare-scan-migration.mjs";

describe("scan-data migration identity", () => {
  it("requires an explicit full scanner build", () => {
    expect(() => buildSubsetSql("registry.db")).toThrow(
      "A full 40-character scanner build SHA is required",
    );
    expect(() => buildSubsetSql("registry.db", "02a0f71f61cd5b214f2d4785db876035d79b7d9c".slice(0, 12))).toThrow(
      "A full 40-character scanner build SHA is required",
    );
  });

  it("binds the migration query to the supplied immutable build", () => {
    const build = "1dfb218c0845545639f57f4efd7698f08c5240c3";
    const sql = buildSubsetSql("registry.db", build);

    expect(sql).toContain(`expected_scanner_build = '${build}'`);
    expect(sql).not.toContain("02a0f71f61cd5b214f2d4785db876035d79b7d9c");
  });
});
