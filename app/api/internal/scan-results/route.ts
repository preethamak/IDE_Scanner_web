import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { gunzipSync } from "node:zlib";
import { NextResponse } from "next/server";
import { isTransientScanCallbackError } from "@/lib/scanCallbackError";
import { incompleteArtifactReason, ingestScanBundle } from "@/lib/scanIngest";
import { serviceDb } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
const MAX_CALLBACK_BYTES = 10 * 1024 * 1024;
const MAX_DECODED_BYTES = 50 * 1024 * 1024;

export async function POST(request: Request) {
  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (declaredLength > MAX_CALLBACK_BYTES) return NextResponse.json({ error: "Scan callback payload is too large." }, { status: 413 });
  let body: Buffer;
  try {
    body = await readBoundedBody(request, MAX_CALLBACK_BYTES);
  } catch {
    return NextResponse.json({ error: "Scan callback payload is too large." }, { status: 413 });
  }
  const secret = process.env.SCAN_CALLBACK_SECRET || "";
  const supplied = request.headers.get("x-ide-scanner-signature") || "";
  const expected = createHmac("sha256", secret).update(body).digest("hex");
  if (!secret || supplied.length !== expected.length || !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) return NextResponse.json({ error: "Invalid scan callback signature." }, { status: 401 });
  let receiptId = "";
  let callbackJobId = "";
  try {
    const decoded = request.headers.get("content-encoding") === "gzip"
      ? gunzipSync(body, { maxOutputLength: MAX_DECODED_BYTES }).toString("utf8")
      : body.toString("utf8");
    if (Buffer.byteLength(decoded) > MAX_DECODED_BYTES) return NextResponse.json({ error: "Decoded scan callback payload is too large." }, { status: 413 });
    const payload = JSON.parse(decoded) as { job_id?: string; bundle?: Record<string, unknown>; error?: string };
    if (!payload.job_id) return NextResponse.json({ error: "job_id is required." }, { status: 400 });
    callbackJobId = payload.job_id;
    const db = serviceDb();
    const job = await db.from("scan_jobs").select("id,extension_id,version").eq("id", payload.job_id).maybeSingle();
    if (job.error) throw job.error;
    if (!job.data) return NextResponse.json({ error: "Scan job was not found." }, { status: 404 });
    const receipt = await db.from("scan_callback_receipts").insert({ job_id: payload.job_id, payload_sha256: createHash("sha256").update(body).digest("hex"), outcome: "received" }).select("id").single();
    if (receipt.error) throw receipt.error;
    receiptId = String(receipt.data.id);
    const receivedAt = new Date().toISOString();
    requireSuccessfulWrites(await Promise.all([
      db.from("scan_jobs").update({ lifecycle_stage: payload.error ? "failed" : "ingesting", result_received_at: receivedAt, updated_at: receivedAt, last_event_at: receivedAt }).eq("id", payload.job_id),
      db.from("scan_job_events").insert({ job_id: payload.job_id, stage: payload.error ? "failed" : "ingesting", event_type: payload.error ? "worker_failed" : "callback_received", detail: payload.error ? { error: payload.error.slice(0, 1000) } : {} }),
    ]));
    if (payload.error) {
      const failedAt = new Date().toISOString();
      requireSuccessfulWrites(await Promise.all([
        db.from("scan_jobs").update({ status: "failed", lifecycle_stage: "failed", error: payload.error.slice(0, 1000), callback_error: null, completed_at: failedAt, lease_expires_at: null, updated_at: failedAt, last_event_at: failedAt }).eq("id", payload.job_id),
        db.from("extension_versions").update({ scan_state: "failed" }).eq("extension_id", job.data.extension_id).eq("version", job.data.version),
        db.from("scan_runner_status").upsert({ id: "github-actions", last_seen_at: failedAt, last_failure_at: failedAt, last_error: payload.error.slice(0, 500) }, { onConflict: "id" }),
        db.from("scan_callback_receipts").update({ outcome: "accepted", completed_at: failedAt }).eq("id", receiptId),
      ]));
      return NextResponse.json({ status: "failed" });
    }
    if (!payload.bundle) throw new Error("bundle is required for a completed scan.");
    const acquisitionFailure = incompleteArtifactReason(payload.bundle);
    if (acquisitionFailure) {
      const incompleteAt = new Date().toISOString();
      requireSuccessfulWrites(await Promise.all([
        db.from("scan_jobs").update({ status: "incomplete", lifecycle_stage: "completed", error: acquisitionFailure, callback_error: null, completed_at: incompleteAt, lease_expires_at: null, updated_at: incompleteAt, last_event_at: incompleteAt }).eq("id", payload.job_id),
        db.from("extension_versions").update({ scan_state: "incomplete" }).eq("extension_id", job.data.extension_id).eq("version", job.data.version),
        db.from("scan_runner_status").upsert({ id: "github-actions", last_seen_at: incompleteAt, last_failure_at: incompleteAt, last_error: acquisitionFailure.slice(0, 500) }, { onConflict: "id" }),
        db.from("scan_job_events").insert({ job_id: payload.job_id, stage: "completed", event_type: "artifact_incomplete", detail: { error: acquisitionFailure } }),
        db.from("scan_callback_receipts").update({ outcome: "accepted", completed_at: incompleteAt }).eq("id", receiptId),
      ]));
      return NextResponse.json({ status: "incomplete", reason: acquisitionFailure });
    }
    const scanId = await ingestScanBundle(payload.job_id, payload.bundle);
    const accepted = await db.from("scan_callback_receipts").update({ outcome: "accepted", completed_at: new Date().toISOString() }).eq("id", receiptId);
    if (accepted.error) throw accepted.error;
    return NextResponse.json({ scan_id: scanId });
  } catch (error) {
    const detail = error instanceof Error ? error.message : typeof error === "object" && error ? JSON.stringify(error) : "Scan ingestion failed.";
    if (isTransientScanCallbackError(error)) {
      return NextResponse.json(
        { error: "Scan result storage is temporarily unavailable. Retry this callback." },
        { status: 503, headers: { "Retry-After": "2" } },
      );
    }
    if (receiptId) {
      const db = serviceDb();
      const rejectedAt = new Date().toISOString();
      const rejectedWrites = await Promise.all([
        db.from("scan_callback_receipts").update({ outcome: "rejected", error: detail.slice(0, 2000), completed_at: rejectedAt }).eq("id", receiptId),
        db.from("scan_jobs").update({ lifecycle_stage: "failed", status: "failed", callback_error: detail.slice(0, 1000), error: "The worker result could not be ingested.", completed_at: rejectedAt, lease_expires_at: null, updated_at: rejectedAt, last_event_at: rejectedAt }).eq("id", callbackJobId),
        db.from("scan_job_events").insert({ job_id: callbackJobId, stage: "failed", event_type: "callback_rejected", detail: { error: detail.slice(0, 2000) } }),
      ]);
      const rejectionError = rejectedWrites.find((result) => result.error)?.error;
      if (rejectionError) return NextResponse.json({ error: "Scan ingestion and failure recording both failed." }, { status: 503 });
    }
    return NextResponse.json({ error: detail.slice(0, 2000) }, { status: 422 });
  }
}

async function readBoundedBody(request: Request, limit: number): Promise<Buffer> {
  if (!request.body) return Buffer.alloc(0);
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > limit) {
      await reader.cancel();
      throw new Error("payload exceeds limit");
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks, length);
}

function requireSuccessfulWrites(
  results: Array<{ error: { message?: string } | null }>,
): void {
  const error = results.find((result) => result.error)?.error;
  if (error) throw error;
}
