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
});
