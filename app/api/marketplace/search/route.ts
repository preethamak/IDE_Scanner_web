import { NextResponse } from "next/server";
import { searchMarketplace } from "@/lib/marketplace";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() || "";
  if (!query) return NextResponse.json({ results: [] });
  try {
    return NextResponse.json({ results: await searchMarketplace(query) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Marketplace search failed", results: [] }, { status: 502 });
  }
}
