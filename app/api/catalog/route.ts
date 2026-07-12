import { NextResponse } from "next/server";
import { listCatalog } from "@/lib/productData";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const url = new URL(request.url);
  try {
    return NextResponse.json({ extensions: await listCatalog(url.searchParams.get("q") || "", Number(url.searchParams.get("limit") || 50)) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Catalog query failed", extensions: [] }, { status: 502 });
  }
}
