import { NextResponse } from "next/server";
import { normalizeMarketplaceId } from "@/lib/marketplace";
import { queueDeepScan } from "@/lib/deepScan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  const payload = await request.json().catch(() => ({})) as { extension_id?: string; version?: string };
  try {
    const extensionId = normalizeMarketplaceId(String(payload.extension_id || ""));
    const job = await queueDeepScan(extensionId, payload.version?.trim() || undefined, request);
    return NextResponse.json(job, { status: 202 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Deep Scan could not be queued." }, { status: 429 });
  }
}
