import { NextResponse } from "next/server";
import { searchMarketplace } from "@/lib/marketplace";
import { unstable_cache } from "next/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const cachedSearch=unstable_cache(async(query:string)=>searchMarketplace(query),["registry-search-v2"],{revalidate:3600,tags:["registry-search"]});

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() || "";
  if (!query) return NextResponse.json({ results: [] });
  try {
    const results=await Promise.race([cachedSearch(query),new Promise<never>((_,reject)=>setTimeout(()=>reject(new Error("Extension registries are responding slowly. Try the exact publisher.extension identifier.")),8000))]);
    return NextResponse.json({ results, source:"registry-cache" });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Marketplace search failed", results: [] }, { status: 502 });
  }
}
