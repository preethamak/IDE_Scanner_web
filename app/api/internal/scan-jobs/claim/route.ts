import { NextResponse } from "next/server";
import { validRunnerSecret } from "@/lib/internalRunnerAuth";
import { serviceDb } from "@/lib/supabase";
import { claimCloudflareJob, cloudflarePrivateAvailable } from "@/lib/cloudflareDeepScan";
import { runtimeEnv } from "@/lib/runtimeEnv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const scanJobIdPattern = /^(?:candidate-)?[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isD1DailyReadLimitError(error: unknown): boolean {
  const code = error && typeof error === "object" && "code" in error ? String((error as { code?: unknown }).code || "") : "";
  const message = error instanceof Error ? error.message : String(error || "");
  return code === "7500" || /daily row[- ]read limit|free tier daily row reads|d1.*row[- ]read/i.test(`${code} ${message}`);
}

function secondsUntilUtcReset(): string {
  const now = new Date();
  const reset = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  return String(Math.max(60, Math.ceil((reset - now.getTime()) / 1000)));
}

export async function POST(request: Request) {
  if (!validRunnerSecret(request.headers.get("authorization"))) return NextResponse.json({ error: "Unauthorized runner." }, { status: 401 });
  const payload = await request.json().catch(() => ({})) as { runner_id?: string; job_id?: string | null; github_run_id?: string | number | null; github_sha?: string | null };
  const runnerId = String(payload.runner_id || "github-actions");
  if (!/^[a-zA-Z0-9._:-]{1,120}$/.test(runnerId)) return NextResponse.json({ error: "Invalid runner identity." }, { status: 400 });
  const jobId = payload.job_id ? String(payload.job_id) : null;
  if (jobId && !scanJobIdPattern.test(jobId)) return NextResponse.json({ error: "Invalid scan job identity." }, { status: 400 });
  const githubRunId = payload.github_run_id == null || payload.github_run_id === "" ? null : Number(payload.github_run_id);
  if (githubRunId !== null && (!Number.isSafeInteger(githubRunId) || githubRunId <= 0)) return NextResponse.json({ error: "Invalid GitHub run identity." }, { status: 400 });
  const githubSha = String(payload.github_sha || "").trim().toLowerCase();
  if (!/^[0-9a-f]{40}$/.test(githubSha)) return NextResponse.json({ error: "Invalid GitHub build identity." }, { status: 400 });

  if (cloudflarePrivateAvailable()) {
    try {
      const job = await claimCloudflareJob({ runnerId, jobId, githubRunId, githubSha });
      if (!job) return new NextResponse(null, { status: 204 });
      return NextResponse.json({ id: job.id, extension_id: job.extension_id, version: job.version, target_platform: String(job.target_platform || ""), callback_url: `${runtimeEnv("NEXT_PUBLIC_SITE_URL") || "https://abscissa.dev"}/api/internal/scan-results` });
    } catch (error) {
      console.error("Cloudflare scan claim failed", error);
      if (isD1DailyReadLimitError(error)) {
        return NextResponse.json(
          { error: "The scan queue is paused until the D1 daily row-read limit resets." },
          { status: 429, headers: { "Retry-After": secondsUntilUtcReset() } },
        );
      }
      return NextResponse.json({ error: "The scan queue is temporarily unavailable; retry shortly." }, { status: 503 });
    }
  }

  const result = await serviceDb().rpc("claim_deep_scan_job", { p_runner_id: runnerId, p_scanner_build: githubSha, p_job_id: jobId, p_github_run_id: githubRunId });
  if (result.error) return NextResponse.json({ error: "The scan queue could not be claimed." }, { status: 503 });
  const job = Array.isArray(result.data) ? result.data[0] : result.data;
  if (!job?.id) return new NextResponse(null, { status: 204 });
  if (!job.expected_scanner_build || String(job.expected_scanner_build).toLowerCase() !== githubSha) {
    return NextResponse.json({ error: "Claimed job is not bound to this scanner build." }, { status: 409 });
  }
  return NextResponse.json({ id: job.id, extension_id: job.extension_id, version: job.version, target_platform: String(job.target_platform || ""), callback_url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://abscissa.dev"}/api/internal/scan-results` });
}
