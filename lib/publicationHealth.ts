import { getDeepScanHealth } from "@/lib/deepScanHealth";
import { serviceDb } from "@/lib/supabase";

export type PublicationHealth = {
  healthy: boolean;
  reasons: string[];
  active_release: { id: string; expected_reports: number; activated_at: string } | null;
  current_report_count: number;
  newest_scan_at: string | null;
  runner_status: string;
  runner_last_seen_at: string | null;
  notification_failure_rate: number;
};

export function evaluatePublicationHealth(input: Omit<PublicationHealth, "healthy" | "reasons">): PublicationHealth {
  const reasons: string[] = [];
  if (!input.active_release) reasons.push("No active public classification release.");
  else if (input.current_report_count < input.active_release.expected_reports) reasons.push("Active release is missing published reports.");
  if (!input.newest_scan_at || Date.now() - new Date(input.newest_scan_at).getTime() > 30 * 60 * 60 * 1000) reasons.push("Public scan corpus is older than 30 hours.");
  if (input.runner_status !== "available") reasons.push(`Deep Scan runner is ${input.runner_status}.`);
  if (input.notification_failure_rate > 0.1) reasons.push("Notification failure rate exceeds 10 percent.");
  return { ...input, healthy: reasons.length === 0, reasons };
}

export async function getPublicationHealth(): Promise<PublicationHealth> {
  const db = serviceDb();
  const releaseResult = await db.from("scan_publication_releases").select("id,policy_version,ruleset_version,score_schema_version,scanner_build,expected_reports,activated_at").eq("active", true).maybeSingle();
  if (releaseResult.error) throw releaseResult.error;
  const release = releaseResult.data;
  const [runner, deliveries] = await Promise.all([
    getDeepScanHealth(),
    db.from("team_notification_deliveries").select("status").in("status", ["sent", "failed", "skipped"]).gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()).limit(1000),
  ]);
  if (deliveries.error) throw deliveries.error;
  let currentReportCount = 0; let newestScanAt: string | null = null;
  if (release) {
    const scans = await db.from("scans").select("scanned_at", { count: "exact" }).in("scan_purpose", ["public_intelligence", "benchmark"]).eq("analysis_status", "complete").eq("policy_version", release.policy_version).eq("ruleset_version", release.ruleset_version).eq("score_schema_version", release.score_schema_version).eq("scanner_build", release.scanner_build).is("superseded_at", null).order("scanned_at", { ascending: false }).limit(1);
    if (scans.error) throw scans.error;
    currentReportCount = scans.count || 0; newestScanAt = scans.data?.[0]?.scanned_at || null;
  }
  const completed = deliveries.data || [];
  const failures = completed.filter((item) => item.status === "failed").length;
  return evaluatePublicationHealth({ active_release: release ? { id: String(release.id), expected_reports: Number(release.expected_reports), activated_at: String(release.activated_at) } : null, current_report_count: currentReportCount, newest_scan_at: newestScanAt, runner_status: runner.status, runner_last_seen_at: runner.last_seen_at, notification_failure_rate: completed.length ? failures / completed.length : 0 });
}
