import { describe, expect, it } from "vitest";
import { canQueueCatalogScan, targetComparisonReady } from "@/lib/releaseQueuePriority";

describe("monitored release queue contract", () => {
  it("reserves dispatch capacity for a monitored release after the public batch is full", () => {
    expect(canQueueCatalogScan({ queued: 100, limit: 100, monitoredRelease: false })).toBe(false);
    expect(canQueueCatalogScan({ queued: 100, limit: 100, monitoredRelease: true })).toBe(true);
  });

  it("requires a complete hash-pinned full-coverage target before comparison", () => {
    expect(targetComparisonReady({ analysis_status: "complete", coverage_percent: 99, artifact_sha256: "a".repeat(64) })).toBe(false);
    expect(targetComparisonReady({ analysis_status: "complete", coverage_percent: 100, artifact_sha256: "a".repeat(64) })).toBe(true);
  });
});
