import { describe, expect, it } from "vitest";
import { evaluatePublicationHealth, failureRateFromCounts, hasAccuracyGateAttestation, summarizeRegistryPublication, summarizeReleaseMemberScans } from "@/lib/publicationHealth";

describe("hasAccuracyGateAttestation", () => {
  it("requires corpus identity and a full gate digest", () => {
    expect(hasAccuracyGateAttestation({ accuracy_gate_corpus_id: "holdout", accuracy_gate_corpus_version: "1", accuracy_gate_sha256: "a".repeat(64) })).toBe(true);
    expect(hasAccuracyGateAttestation({ accuracy_gate_corpus_id: "holdout", accuracy_gate_corpus_version: "1", accuracy_gate_sha256: "a".repeat(63) })).toBe(false);
    expect(hasAccuracyGateAttestation(null)).toBe(false);
  });
});

describe("evaluatePublicationHealth", () => {
  it("requires an active, complete, current release", () => {
    const health = evaluatePublicationHealth({ active_release: { id: "release", expected_reports: 10, activated_at: "2026-07-30T00:00:00.000Z", accuracy_gate_verified: true }, current_report_count: 10, newest_scan_at: new Date().toISOString(), runner_status: "ready", runner_last_seen_at: new Date().toISOString(), scan_failure_rate: 0, notification_failure_rate: 0 });
    expect(health.healthy).toBe(true);
  });

  it("rejects a release without an accuracy-gate attestation", () => {
    const health = evaluatePublicationHealth({ active_release: { id: "release", expected_reports: 10, activated_at: "2026-07-30T00:00:00.000Z", accuracy_gate_verified: false }, current_report_count: 10, newest_scan_at: new Date().toISOString(), runner_status: "ready", runner_last_seen_at: new Date().toISOString(), scan_failure_rate: 0, notification_failure_rate: 0 });
    expect(health.healthy).toBe(false);
    expect(health.reasons).toContain("Active public classification release has no accuracy-gate attestation.");
  });
  it("reports missing scan and delivery samples as unavailable rather than zero failures", () => {
    const health = evaluatePublicationHealth({ active_release: { id: "release", expected_reports: 1, activated_at: new Date().toISOString(), accuracy_gate_verified: true }, current_report_count: 1, newest_scan_at: new Date().toISOString(), runner_status: "ready", runner_last_seen_at: new Date().toISOString(), scan_failure_rate: null, notification_failure_rate: null });
    expect(health.healthy).toBe(false);
    expect(health.scan_failure_rate).toBeNull();
    expect(health.notification_failure_rate).toBeNull();
    expect(health.reasons).toEqual(expect.arrayContaining(["Scan failure rate is unavailable or invalid.", "Notification failure rate is unavailable or invalid."]));
  });
  it("excludes queued and skipped attempts from operational samples", () => {
    expect(failureRateFromCounts([{ status: "queued", count: 2 }, { status: "skipped", count: 3 }], "sent", ["failed"])).toBeNull();
    expect(failureRateFromCounts([{ status: "sent", count: 3 }, { status: "failed", count: 1 }, { status: "skipped", count: 9 }], "sent", ["failed"])).toBe(0.25);
    expect(failureRateFromCounts([{ status: "complete", count: "invalid" }], "complete", ["failed"])).toBeNull();
  });
  it("reports each failed launch dependency", () => {
    const health = evaluatePublicationHealth({ active_release: null, current_report_count: 0, newest_scan_at: null, runner_status: "configuration_unavailable", runner_last_seen_at: null, scan_failure_rate: 0.2, notification_failure_rate: 0.2 });
    expect(health.reasons).toHaveLength(5);
  });
  it("fails closed when the runner heartbeat is degraded", () => {
    const health = evaluatePublicationHealth({ active_release: { id: "release", expected_reports: 1, activated_at: "2026-07-30T00:00:00.000Z", accuracy_gate_verified: true }, current_report_count: 1, newest_scan_at: new Date().toISOString(), runner_status: "runner_delayed", runner_last_seen_at: "2026-07-30T00:00:00.000Z", scan_failure_rate: 0, notification_failure_rate: 0 });
    expect(health).toMatchObject({ healthy: false, runner_last_seen_at: "2026-07-30T00:00:00.000Z" });
    expect(health.reasons).toContain("Deep Scan runner is runner_delayed.");
  });
  it.each([
    { newest_scan_at: "invalid" },
    { newest_scan_at: new Date(Date.now() + 60 * 60 * 1000).toISOString() },
    { current_report_count: NaN },
    { scan_failure_rate: NaN },
    { notification_failure_rate: -1 },
    { active_release: { id: "release", expected_reports: 0, activated_at: "", accuracy_gate_verified: true } },
    { active_release: { id: "release", expected_reports: 1, activated_at: "" } },
  ])("rejects invalid or unverified publication evidence: %j", (override) => {
    const health = evaluatePublicationHealth({ active_release: { id: "release", expected_reports: 1, activated_at: new Date().toISOString(), accuracy_gate_verified: true }, current_report_count: 1, newest_scan_at: new Date().toISOString(), runner_status: "ready", runner_last_seen_at: new Date().toISOString(), scan_failure_rate: 0, notification_failure_rate: 0, ...override });
    expect(health.healthy).toBe(false);
  });

  it("uses immutable release members instead of mutable release metadata", () => {
    expect(summarizeReleaseMemberScans([
      { id: "scan-a", scanned_at: "2026-08-01T00:00:00.000Z" },
      { id: "scan-b", scanned_at: "2026-08-01T01:00:00.000Z" },
      { id: "scan-a", scanned_at: "2026-08-01T00:00:00.000Z" },
    ])).toEqual({ current_report_count: 2, newest_scan_at: "2026-08-01T01:00:00.000Z" });
  });

  it("accepts an active attested Cloudflare registry as the public release fallback", () => {
    expect(summarizeRegistryPublication({
      publication: {
        release_id: "registry-release",
        accuracy_gate_corpus_id: "holdout",
        accuracy_gate_corpus_version: "1",
        accuracy_gate_sha256: "a".repeat(64),
      },
      items: [
        { scan_id: "scan-a", scanned_at: "2026-08-01T00:00:00.000Z" },
        { scan_id: "scan-b", scanned_at: "2026-08-01T01:00:00.000Z" },
      ],
    }, "2026-08-01T02:00:00.000Z")).toMatchObject({
      active_release: { id: "registry-release", expected_reports: 2, accuracy_gate_verified: true },
      current_report_count: 2,
      newest_scan_at: "2026-08-01T01:00:00.000Z",
    });
  });
});
