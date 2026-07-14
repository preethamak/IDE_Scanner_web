import { createHmac, timingSafeEqual } from "node:crypto";
import { gunzipSync } from "node:zlib";
import { NextResponse } from "next/server";
import { ingestScanBundle } from "@/lib/scanIngest";
import { serviceDb } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  const body = Buffer.from(await request.arrayBuffer());
  const secret = process.env.SCAN_CALLBACK_SECRET || "";
  const supplied = request.headers.get("x-ide-scanner-signature") || "";
  const expected = createHmac("sha256", secret).update(body).digest("hex");
  if (!secret || supplied.length !== expected.length || !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) return NextResponse.json({ error: "Invalid scan callback signature." }, { status: 401 });
  try {
    const decoded = request.headers.get("content-encoding") === "gzip" ? gunzipSync(body).toString("utf8") : body.toString("utf8");
    const payload = JSON.parse(decoded) as { job_id?: string; bundle?: Record<string, unknown>; error?: string };
    if (!payload.job_id) return NextResponse.json({ error: "job_id is required." }, { status: 400 });
    if (payload.error) {
      const db = serviceDb();
      const job = await db.from("scan_jobs").select("extension_id,version").eq("id", payload.job_id).maybeSingle();
      if (job.error || !job.data) return NextResponse.json({ error: "Scan job was not found." }, { status: 404 });
      const failedAt = new Date().toISOString();
      await Promise.all([
        db.from("scan_jobs").update({ status: "failed", error: payload.error.slice(0, 1000), completed_at: failedAt, lease_expires_at: null }).eq("id", payload.job_id),
        db.from("extension_versions").update({ scan_state: "failed" }).eq("extension_id", job.data.extension_id).eq("version", job.data.version),
        db.from("scan_runner_status").upsert({ id: "github-actions", last_seen_at: failedAt, last_failure_at: failedAt, last_error: payload.error.slice(0, 500) }, { onConflict: "id" }),
      ]);
      return NextResponse.json({ status: "failed" });
    }
    if (!payload.bundle) return NextResponse.json({ error: "bundle is required for a completed scan." }, { status: 400 });
    return NextResponse.json({ scan_id: await ingestScanBundle(payload.job_id, payload.bundle) });
  } catch (error) {
    const detail = error instanceof Error ? error.message : typeof error === "object" && error ? JSON.stringify(error) : "Scan ingestion failed.";
    return NextResponse.json({ error: detail.slice(0, 2000) }, { status: 422 });
  }
}
