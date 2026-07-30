import { describe, expect, it } from "vitest";
import { evaluatePublicationHealth } from "@/lib/publicationHealth";

describe("evaluatePublicationHealth", () => {
  it("requires an active, complete, current release", () => {
    const health = evaluatePublicationHealth({ active_release: { id: "release", expected_reports: 10, activated_at: "2026-07-30T00:00:00.000Z" }, current_report_count: 10, newest_scan_at: new Date().toISOString(), runner_status: "available", notification_failure_rate: 0 });
    expect(health.healthy).toBe(true);
  });
  it("reports each failed launch dependency", () => {
    const health = evaluatePublicationHealth({ active_release: null, current_report_count: 0, newest_scan_at: null, runner_status: "unconfigured", notification_failure_rate: 0.2 });
    expect(health.reasons).toHaveLength(4);
  });
});
