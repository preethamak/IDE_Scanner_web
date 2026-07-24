import { NextResponse } from "next/server";
import { dispatchDeepScan } from "@/lib/deepScan";
import { serviceDb } from "@/lib/supabase";
import { serverDb } from "@/lib/supabaseServer";
import { scanProgressColumns, scanProgressPayload } from "@/lib/scanProgress";

export const dynamic = "force-dynamic";

// A queued/running job only becomes terminal when the signed worker callback
// lands. When that callback is lost the job would otherwise poll forever, so
// the poller reconciles past-deadline jobs itself: the RPC only touches rows
// with an expired lease or a queued job older than the grace window, making the
// watching UI its own backstop even if no GitHub worker ever fires.
const QUEUE_GRACE_MINUTES = 20;

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    const db=await serverDb(); const {data:{user}}=await db.auth.getUser(); if(!user)return NextResponse.json({error:"Sign in to view scan progress."},{status:401});
    const service = serviceDb();
    const subscription = await service.from("scan_job_subscribers").select("job_id").eq("job_id", id).eq("user_id", user.id).maybeSingle();
    if (subscription.error) throw subscription.error;
    if (!subscription.data) return NextResponse.json({ error: "Scan job not found." }, { status: 404 });

    const { data, error } = await service.from("scan_jobs").select(scanProgressColumns).eq("id", id).maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Scan job not found." }, { status: 404 });

    if (data.status === "queued" && !data.github_run_id) {
      // GitHub can acknowledge a workflow dispatch without starting it. Polling
      // provides a bounded, atomic wake-up path rather than waiting for the
      // delayed schedule or incorrectly declaring that no runner exists.
      await dispatchDeepScan(String(data.id), 120).catch(() => false);
    }

    if (isStale(data)) {
      const reconciled = await service.rpc("reconcile_stale_deep_scans", { p_queue_grace_minutes: QUEUE_GRACE_MINUTES });
      if (!reconciled.error) {
        const refreshed = await service.from("scan_jobs").select(scanProgressColumns).eq("id", id).maybeSingle();
        if (!refreshed.error && refreshed.data) return NextResponse.json(await scanProgressPayload(service, refreshed.data));
      }
    }
    return NextResponse.json(await scanProgressPayload(service, data));
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
