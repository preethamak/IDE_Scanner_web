import { NextResponse } from "next/server";
import { getDeepScanHealth } from "@/lib/deepScanHealth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await getDeepScanHealth(), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ available: false, status: "degraded", last_seen_at: null }, { headers: { "Cache-Control": "no-store" } });
  }
}
