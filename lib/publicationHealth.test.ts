import { describe, expect, it } from "vitest";
import { evaluatePublicationHealth } from "@/lib/publicationHealth";

describe("evaluatePublicationHealth", () => {
  it("requires an active, complete, current release", () => {
    const health = evaluatePublicationHealth({ active_release: { id: "release", expected_reports: 10, activated_at: "2026-07-30T00:00:00.000Z" }, current_report_count: 10, newest_scan_at: new Date().toISOString(), runner_status: "available", runner_last_seen_at: new Date().toISOString(), scan_failure_rate: 0, notification_failure_rate: 0 });
    expect(health.healthy).toBe(true);
  });
  it("reports each failed launch dependency", () => {
    const health = evaluatePublicationHealth({ active_release: null, current_report_count: 0, newest_scan_at: null, runner_status: "unconfigured", runner_last_seen_at: null, scan_failure_rate: 0.2, notification_failure_rate: 0.2 });
    expect(health.reasons).toHaveLength(5);
  });
  it("fails closed when the runner heartbeat is degraded", () => {
    const health = evaluatePublicationHealth({ active_release: { id: "release", expected_reports: 1, activated_at: "2026-07-30T00:00:00.000Z" }, current_report_count: 1, newest_scan_at: new Date().toISOString(), runner_status: "degraded", runner_last_seen_at: "2026-07-30T00:00:00.000Z", scan_failure_rate: 0, notification_failure_rate: 0 });
    expect(health).toMatchObject({ healthy: false, runner_last_seen_at: "2026-07-30T00:00:00.000Z" });
    expect(health.reasons).toContain("Deep Scan runner is degraded.");
  });
});
