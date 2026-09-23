import { describe, expect, it } from "vitest";
import { buildTriageBuckets } from "@/lib/triage";

const cleanWithContext = {
  extension_id: "example.theme",
  name: "Theme",
  publisher: "example",
  version: "1.0.0",
  source: "fixtures",
  severity: "INFO",
  verdict: "clean" as const,
  risk_score: 0,
  malware_score: 0,
  finding_count: 5,
  actionable_finding_count: 0,
  low_finding_count: 0,
  contextual_finding_count: 5,
  top_findings: [],
};

describe("triage actionability", () => {
  it("does not put a clean zero-risk context-only artifact on the watch list", () => {
    const watch = buildTriageBuckets([cleanWithContext]).find((bucket) => bucket.id === "watch");
    expect(watch?.extensions).toHaveLength(0);
  });

  it("keeps legacy summaries with findings visible until they have a breakdown", () => {
    const legacy = { ...cleanWithContext, actionable_finding_count: undefined, low_finding_count: undefined, contextual_finding_count: undefined };
    const watch = buildTriageBuckets([legacy]).find((bucket) => bucket.id === "watch");
    expect(watch?.extensions).toHaveLength(1);
  });
});
