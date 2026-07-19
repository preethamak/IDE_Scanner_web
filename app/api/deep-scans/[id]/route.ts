import { NextResponse } from "next/server";
import { serviceDb } from "@/lib/supabase";
import { serverDb } from "@/lib/supabaseServer";
import { withReportUrl } from "@/lib/deepScan";

export const dynamic = "force-dynamic";

// A queued/running job only becomes terminal when the signed worker callback
// lands. When that callback is lost the job would otherwise poll forever, so
// the poller reconciles past-deadline jobs itself: the RPC only touches rows
// with an expired lease or a queued job older than the grace window, making the
// watching UI its own backstop even if no GitHub worker ever fires.
const QUEUE_GRACE_MINUTES = 20;
const SELECT = "id,extension_id,version,profile,status,error,created_at,started_at,completed_at,lease_expires_at";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    const db=await serverDb(); const {data:{user}}=await db.auth.getUser(); if(!user)return NextResponse.json({error:"Sign in to view scan progress."},{status:401});
    // The queue deliberately deduplicates work across users and catalog jobs.
    // Such a job can have a different (or no) requested_by value, so querying
    // through the user's RLS-scoped client makes a just-returned job ID appear
    // to vanish while it is still queued or running. The ID is only returned
    // by the authenticated queue endpoint; use the server-only client here to
    // expose its limited progress payload to that authenticated poller.
    const service = serviceDb();
    const { data, error } = await service.from("scan_jobs").select(SELECT).eq("id", id).maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Scan job not found." }, { status: 404 });

    if (isStale(data)) {
      const reconciled = await service.rpc("reconcile_stale_deep_scans", { p_queue_grace_minutes: QUEUE_GRACE_MINUTES });
      if (!reconciled.error) {
        const refreshed = await service.from("scan_jobs").select(SELECT).eq("id", id).maybeSingle();
        if (!refreshed.error && refreshed.data) return NextResponse.json(withReportUrl(refreshed.data));
      }
    }
    return NextResponse.json(withReportUrl(data));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Scan lookup failed." }, { status: 502 });
  }
}

function isStale(job: Record<string, unknown>): boolean {
  const status = String(job.status);
  const now = Date.now();
  if (status === "running") {
    const lease = job.lease_expires_at ? new Date(String(job.lease_expires_at)).getTime() : NaN;
    return Number.isFinite(lease) && lease < now;
  }
  if (status === "queued") {
    const created = job.created_at ? new Date(String(job.created_at)).getTime() : NaN;
    return Number.isFinite(created) && now - created > QUEUE_GRACE_MINUTES * 60_000;
  }
  return false;
}
