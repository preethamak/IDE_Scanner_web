import type { SupabaseClient } from "@supabase/supabase-js";
import { withReportUrl } from "@/lib/deepScan";

export const scanProgressColumns = "id,extension_id,version,profile,status,lifecycle_stage,error,callback_error,dispatch_count,dispatch_requested_at,dispatch_succeeded_at,github_run_id,runner_id,attempt_count,created_at,started_at,result_received_at,completed_at,lease_expires_at,updated_at,last_event_at";

export async function scanProgressPayload(db: SupabaseClient, job: Record<string, unknown>): Promise<Record<string, unknown>> {
  const jobId = String(job.id || "");
  const queue = job.status === "queued" ? await db.rpc("deep_scan_queue_position", { p_job_id: jobId }) : { data: 0, error: null };
  if (queue.error) throw queue.error;
  const events = await db.from("scan_job_events").select("stage,event_type,detail,created_at").eq("job_id", jobId).order("created_at", { ascending: false }).limit(12);
  if (events.error) throw events.error;
  const runId = Number(job.github_run_id || 0);
  const owner = process.env.GITHUB_REPO_OWNER || "preethamak";
  const repository = process.env.GITHUB_SCANNER_REPO || "IDE_Scanner";
  let scanId: string | null = null;
  if (["complete", "incomplete"].includes(String(job.status))) {
    const scan = await db.from("scans").select("id").eq("job_id", jobId).limit(1).maybeSingle();
    if (scan.error) throw scan.error;
    scanId = scan.data?.id ? String(scan.data.id) : null;
  }
  return withReportUrl({
    ...job,
    scan_id: scanId,
    queue_position: Number(queue.data || 0),
    github_run_url: Number.isSafeInteger(runId) && runId > 0 ? `https://github.com/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}/actions/runs/${runId}` : null,
    events: events.data || [],
  });
}
