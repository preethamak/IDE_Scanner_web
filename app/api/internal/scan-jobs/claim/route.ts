import { NextResponse } from "next/server";
import { validRunnerSecret } from "@/lib/internalRunnerAuth";
import { serviceDb } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!validRunnerSecret(request.headers.get("authorization"))) return NextResponse.json({ error: "Unauthorized runner." }, { status: 401 });
  const payload = await request.json().catch(() => ({})) as { runner_id?: string; job_id?: string | null; github_run_id?: string | number | null };
  const runnerId = String(payload.runner_id || "github-actions");
  if (!/^[a-zA-Z0-9._:-]{1,120}$/.test(runnerId)) return NextResponse.json({ error: "Invalid runner identity." }, { status: 400 });
  const jobId = payload.job_id ? String(payload.job_id) : null;
  if (jobId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(jobId)) return NextResponse.json({ error: "Invalid scan job identity." }, { status: 400 });
  const githubRunId = payload.github_run_id == null || payload.github_run_id === "" ? null : Number(payload.github_run_id);
  if (githubRunId !== null && (!Number.isSafeInteger(githubRunId) || githubRunId <= 0)) return NextResponse.json({ error: "Invalid GitHub run identity." }, { status: 400 });

  const result = await serviceDb().rpc("claim_deep_scan_job", { p_runner_id: runnerId, p_job_id: jobId, p_github_run_id: githubRunId });
  if (result.error) return NextResponse.json({ error: "The scan queue could not be claimed." }, { status: 503 });
  const job = Array.isArray(result.data) ? result.data[0] : result.data;
  if (!job?.id) return new NextResponse(null, { status: 204 });
  return NextResponse.json({ id: job.id, extension_id: job.extension_id, version: job.version, callback_url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://ide-scanner.vercel.app"}/api/internal/scan-results` });
}
