import { serviceDb } from "@/lib/supabase";

export type DeepScanHealth = { available: boolean; status: "available" | "degraded" | "unconfigured"; last_seen_at: string | null };

export async function getDeepScanHealth(): Promise<DeepScanHealth> {
  if (!process.env.SCAN_RUNNER_SECRET) return { available: false, status: "unconfigured", last_seen_at: null };
  const result = await serviceDb().from("scan_runner_status").select("last_seen_at").eq("id", "github-actions").maybeSingle();
  // GitHub schedules are best-effort. A delayed heartbeat must not prevent a valid
  // signed-in user from queueing work for the next runner invocation.
  if (result.error || !result.data?.last_seen_at) return { available: true, status: "degraded", last_seen_at: null };
  const lastSeen = String(result.data.last_seen_at);
  const recent = Date.now() - new Date(lastSeen).getTime() < 12 * 60_000;
  return { available: true, status: recent ? "available" : "degraded", last_seen_at: lastSeen };
}
