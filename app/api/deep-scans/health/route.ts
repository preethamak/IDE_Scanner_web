import { NextResponse } from "next/server";
import { getDeepScanHealth } from "@/lib/deepScanHealth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await getDeepScanHealth(), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ accepting_requests: false, status: "configuration_unavailable", last_seen_at: null }, { headers: { "Cache-Control": "no-store" }, status: 503 });
  }
}
