import { NextResponse } from "next/server";
import { getPublicAnalysisHistory } from "@/lib/productData";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const page = Math.max(1, Number.parseInt(url.searchParams.get("page") || "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(url.searchParams.get("limit") || "24", 10) || 24));
  const history = await getPublicAnalysisHistory(limit, (page - 1) * limit);
  return NextResponse.json({ ...history, page, page_size: limit }, { headers: { "Cache-Control": "public, max-age=60, s-maxage=300" } });
}
