import { NextResponse } from "next/server";
import { websiteBenchmark } from "@/lib/websiteBenchmark";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(websiteBenchmark, {
    headers: { "Cache-Control": "public, max-age=300, s-maxage=3600" },
  });
}
