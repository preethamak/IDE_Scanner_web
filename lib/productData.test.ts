import { describe, expect, it } from "vitest";
import { dominantPublicClassification, selectVisibleScans } from "@/lib/productData";

describe("public classification rollout selection", () => {
  const build1 = "a".repeat(40);
  const build2 = "b".repeat(40);

  it("selects the broadest exact-artifact cohort instead of a newer canary", () => {
    expect(dominantPublicClassification([
      { extension_id: "one.ext", version: "1", policy_version: "policy-1", ruleset_version: "rules-1", score_schema_version: "2", scanner_build: build1, scanned_at: "2026-07-20" },
      { extension_id: "two.ext", version: "1", policy_version: "policy-1", ruleset_version: "rules-1", score_schema_version: "2", scanner_build: build1, scanned_at: "2026-07-20" },
      { extension_id: "three.ext", version: "1", policy_version: "policy-1", ruleset_version: "rules-1", score_schema_version: "2", scanner_build: build1, scanned_at: "2026-07-20" },
      { extension_id: "one.ext", version: "1", policy_version: "policy-2", ruleset_version: "rules-2", score_schema_version: "3", scanner_build: build2, scanned_at: "2026-07-24" },
    ])).toEqual({
      policyVersion: "policy-1",
      rulesetVersion: "rules-1",
      scoreSchemaVersion: "2",
      scannerBuild: build1,
    });
  });

  it("counts case-insensitive exact releases once and rejects legacy identities", () => {
    expect(dominantPublicClassification([
      { extension_id: "Publisher.Ext", version: "1", policy_version: "policy-1", ruleset_version: "rules-1", score_schema_version: "2", scanner_build: build1, scanned_at: "2026-07-20" },
      { extension_id: "publisher.ext", version: "1", policy_version: "policy-1", ruleset_version: "rules-1", score_schema_version: "2", scanner_build: build1, scanned_at: "2026-07-21" },
      { extension_id: "other.ext", version: "1", policy_version: "legacy", ruleset_version: "rules-old", score_schema_version: "1", scanner_build: build2, scanned_at: "2026-07-22" },
    ])).toEqual({
      policyVersion: "policy-1",
      rulesetVersion: "rules-1",
      scoreSchemaVersion: "2",
      scannerBuild: build1,
    });
  });

  it("never combines reports from different scanner builds", () => {
    expect(dominantPublicClassification([
      { extension_id: "one.ext", version: "1", policy_version: "policy-1", ruleset_version: "rules-1", score_schema_version: "2", scanner_build: build1, scanned_at: "2026-07-20" },
      { extension_id: "two.ext", version: "1", policy_version: "policy-1", ruleset_version: "rules-1", score_schema_version: "2", scanner_build: build2, scanned_at: "2026-07-24" },
      { extension_id: "three.ext", version: "1", policy_version: "policy-1", ruleset_version: "rules-1", score_schema_version: "2", scanner_build: build2, scanned_at: "2026-07-24" },
    ])).toEqual({
      policyVersion: "policy-1",
      rulesetVersion: "rules-1",
      scoreSchemaVersion: "2",
      scannerBuild: build2,
    });
  });

  it("selects one visible scan per exact version and prefers the user's own scan", () => {
    const selected = selectVisibleScans(
      [
        { id: "public-1", version: "1.0.0" },
        { id: "public-2", version: "2.0.0" },
      ],
      [
        { id: "owned-1", version: "1.0.0" },
      ],
    );
    expect(selected.get("1.0.0")?.id).toBe("owned-1");
    expect(selected.get("2.0.0")?.id).toBe("public-2");
  });
});
