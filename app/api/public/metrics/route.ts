import { NextResponse } from "next/server";
import { getPublicMetrics } from "@/lib/publicMetrics";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await getPublicMetrics(), { headers: { "Cache-Control": "public, max-age=60, s-maxage=300" } });
}
