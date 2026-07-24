import { describe, expect, it } from "vitest";
import { dominantPublicClassification } from "@/lib/productData";

describe("public classification rollout selection", () => {
  it("selects the broadest exact-artifact cohort instead of a newer canary", () => {
    expect(dominantPublicClassification([
      { extension_id: "one.ext", version: "1", policy_version: "policy-1", ruleset_version: "rules-1", score_schema_version: "2", scanned_at: "2026-07-20" },
      { extension_id: "two.ext", version: "1", policy_version: "policy-1", ruleset_version: "rules-1", score_schema_version: "2", scanned_at: "2026-07-20" },
      { extension_id: "three.ext", version: "1", policy_version: "policy-1", ruleset_version: "rules-1", score_schema_version: "2", scanned_at: "2026-07-20" },
      { extension_id: "one.ext", version: "1", policy_version: "policy-2", ruleset_version: "rules-2", score_schema_version: "3", scanned_at: "2026-07-24" },
    ])).toEqual({
      policyVersion: "policy-1",
      rulesetVersion: "rules-1",
      scoreSchemaVersion: "2",
    });
  });

  it("counts case-insensitive exact releases once and rejects legacy identities", () => {
    expect(dominantPublicClassification([
      { extension_id: "Publisher.Ext", version: "1", policy_version: "policy-1", ruleset_version: "rules-1", score_schema_version: "2", scanned_at: "2026-07-20" },
      { extension_id: "publisher.ext", version: "1", policy_version: "policy-1", ruleset_version: "rules-1", score_schema_version: "2", scanned_at: "2026-07-21" },
      { extension_id: "other.ext", version: "1", policy_version: "legacy", ruleset_version: "rules-old", score_schema_version: "1", scanned_at: "2026-07-22" },
    ])).toEqual({
      policyVersion: "policy-1",
      rulesetVersion: "rules-1",
      scoreSchemaVersion: "2",
    });
  });
});
