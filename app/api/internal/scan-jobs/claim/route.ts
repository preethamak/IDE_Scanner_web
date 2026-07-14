import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { serviceDb } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!validRunnerSecret(request.headers.get("authorization"))) return NextResponse.json({ error: "Unauthorized runner." }, { status: 401 });
  const payload = await request.json().catch(() => ({})) as { runner_id?: string };
  const runnerId = String(payload.runner_id || "github-actions");
  if (!/^[a-zA-Z0-9._:-]{1,120}$/.test(runnerId)) return NextResponse.json({ error: "Invalid runner identity." }, { status: 400 });

  const result = await serviceDb().rpc("claim_next_deep_scan", { p_runner_id: runnerId });
  if (result.error) return NextResponse.json({ error: "The scan queue could not be claimed." }, { status: 503 });
  const job = Array.isArray(result.data) ? result.data[0] : result.data;
  if (!job?.id) return new NextResponse(null, { status: 204 });
  return NextResponse.json({ id: job.id, extension_id: job.extension_id, version: job.version, callback_url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://ide-scanner.vercel.app"}/api/internal/scan-results` });
}

function validRunnerSecret(authorization: string | null): boolean {
  const expected = process.env.SCAN_RUNNER_SECRET || "";
  const supplied = authorization?.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!expected || !supplied) return false;
  const left = createHash("sha256").update(expected).digest();
  const right = createHash("sha256").update(supplied).digest();
  return timingSafeEqual(left, right);
}
