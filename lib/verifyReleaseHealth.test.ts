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

  it("warns catalog refresh when a recent sample is absent without treating it as a passing launch check", () => {
    const body = { healthy: false, runner_status: "ready", current_report_count: 23, scan_failure_rate: null, notification_failure_rate: null, reasons: ["Scan failure rate is unavailable or invalid.", "Notification failure rate is unavailable or invalid."] };
    expect(classifyReleaseHealth(503, body)).toMatchObject({ outcome: "warn" });
    expect(classifyReleaseHealth(503, { ...body, reasons: [...body.reasons, "No active public classification release."] })).toMatchObject({ outcome: "fail" });
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
