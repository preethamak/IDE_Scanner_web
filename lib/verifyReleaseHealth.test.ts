import { describe, expect, it } from "vitest";
import { classifyReleaseHealth } from "../scripts/verify-release-health.mjs";

describe("classifyReleaseHealth", () => {
  it("passes a healthy release response", () => {
    expect(classifyReleaseHealth(200, { healthy: true })).toMatchObject({ outcome: "pass" });
  });

  it("warns when only the runner heartbeat is delayed", () => {
    expect(
      classifyReleaseHealth(503, {
        healthy: false,
        reasons: ["Deep Scan runner is runner_delayed."],
      }),
    ).toMatchObject({ outcome: "warn" });
  });

  it("fails for missing release data or unavailable configuration", () => {
    expect(
      classifyReleaseHealth(503, {
        healthy: false,
        reasons: ["No active public classification release.", "Deep Scan runner is configuration_unavailable."],
      }),
    ).toMatchObject({ outcome: "fail" });
  });

  it("warns when the runner and pipelines are healthy but an older publication manifest is stale", () => {
    expect(
      classifyReleaseHealth(503, {
        healthy: false,
        current_report_count: 23,
        runner_status: "ready",
        scan_failure_rate: 0,
        notification_failure_rate: 0,
        reasons: [
          "Active release is missing published reports.",
          "Public scan corpus is older than 30 hours.",
        ],
      }),
    ).toMatchObject({ outcome: "warn" });
  });
});
