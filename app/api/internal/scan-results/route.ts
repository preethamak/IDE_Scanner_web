import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { ingestScanBundle } from "@/lib/scanIngest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  const body = await request.text();
  const secret = process.env.SCAN_CALLBACK_SECRET || "";
  const supplied = request.headers.get("x-ide-scanner-signature") || "";
  const expected = createHmac("sha256", secret).update(body).digest("hex");
  if (!secret || supplied.length !== expected.length || !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) return NextResponse.json({ error: "Invalid scan callback signature." }, { status: 401 });
  try {
    const payload = JSON.parse(body) as { job_id?: string; bundle?: Record<string, unknown> };
    if (!payload.job_id || !payload.bundle) return NextResponse.json({ error: "job_id and bundle are required." }, { status: 400 });
    return NextResponse.json({ scan_id: await ingestScanBundle(payload.job_id, payload.bundle) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Scan ingestion failed." }, { status: 422 });
  }
}
