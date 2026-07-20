import { describe, expect, it } from "vitest";
import { incompleteArtifactReason } from "@/lib/scanIngest";

describe("scan ingestion boundaries", () => {
  it("keeps artifact acquisition failures explicit without inventing identity", () => {
    const reason = incompleteArtifactReason({ extensions: { "extensions/publisher.large@unknown.json": {
      source: "marketplace-error",
      decision: "incomplete",
      artifact_identity: {},
      artifact_inventory: { skipped_reason: "VSIX download exceeded the configured byte cap; aborted." },
    } } });
    expect(reason).toContain("exceeded the configured byte cap");
  });

  it("does not intercept a report with immutable artifact identity", () => {
    const reason = incompleteArtifactReason({ extensions: [{
      decision: "incomplete",
      artifact_identity: { sha256: "a".repeat(64) },
      artifact_inventory: { skipped_reason: "One analyzer timed out." },
    }] });
    expect(reason).toBeNull();
  });
});
