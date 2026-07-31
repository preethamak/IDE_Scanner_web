import { describe, expect, it } from "vitest";
import { benchmarkValidation } from "@/lib/benchmarkLookup";
import { websiteBenchmark } from "@/lib/websiteBenchmark";
import { benchmarkRows } from "@/lib/websiteBenchmarkRows";

describe("public benchmark corpus", () => {
  it("has one hash-pinned identity for every declared artifact", () => {
    expect(benchmarkRows).toHaveLength(websiteBenchmark.corpus.artifacts);
    const identities = new Set<string>();
    for (const row of benchmarkRows) {
      const identity = `${row.id.toLowerCase()}@${row.version}`;
      expect(identities.has(identity)).toBe(false);
      identities.add(identity);
      expect(row.sha256).toMatch(/^[a-f0-9]{64}$/i);
      expect(["fresh-artifact-holdout", "prior-exposure"]).toContain(row.split);
      expect(benchmarkValidation(row.id, row.version, row.sha256)).toMatchObject({ id: row.id, version: row.version, sha256: row.sha256 });
    }
  });

  it("matches the declared holdout and control split", () => {
    const holdouts = benchmarkRows.filter((row) => row.split === "fresh-artifact-holdout");
    const controls = benchmarkRows.filter((row) => row.split === "prior-exposure");
    expect(holdouts).toHaveLength(websiteBenchmark.corpus.freshHoldouts);
    expect(controls).toHaveLength(websiteBenchmark.corpus.priorExposureControls);
  });
});
