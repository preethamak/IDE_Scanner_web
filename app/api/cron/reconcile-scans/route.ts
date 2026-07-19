import { NextResponse } from "next/server";
import { serviceDb } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Backstop for stranded Deep Scan jobs. The worker callback and the poller
// already reconcile most cases; this route lets any free scheduler (Vercel
// Cron, cron-job.org, a GitHub schedule, uptime pinger) guarantee that a job
// never sits non-terminal indefinitely, even for a version nobody is watching.
// Protected by a bearer secret, mirroring /api/cron/notifications.
export async function POST(request: Request) {
  const expected = process.env.SCAN_RECONCILE_SECRET || process.env.NOTIFICATION_CRON_SECRET || "";
  if (!expected || request.headers.get("authorization") !== `Bearer ${expected}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const grace = Number(new URL(request.url).searchParams.get("grace_minutes")) || 20;
  const result = await serviceDb().rpc("reconcile_stale_deep_scans", { p_queue_grace_minutes: grace });
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
  return NextResponse.json({ reconciled: Number(result.data ?? 0) });
}

// Convenience for schedulers that can only issue GET (e.g. uptime pingers).
export async function GET(request: Request) {
  return POST(request);
}
