import { NextResponse } from "next/server";
import { isPythonBridgeUnavailable, localScannerUnavailableMessage, runPythonBridge } from "@/lib/pythonBridge";
import type { MarketplaceSearchResult } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type BridgeSearchResult = {
  results: MarketplaceSearchResult[];
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") || "").trim();

  if (!query) {
    return NextResponse.json({ results: [] });
  }

  try {
    const result = await runPythonBridge<BridgeSearchResult>("search", { query, limit: 20 });
    return NextResponse.json(result);
  } catch (error) {
    const message = isPythonBridgeUnavailable(error) ? localScannerUnavailableMessage() : error instanceof Error ? error.message : "Marketplace search failed";
    return NextResponse.json({ error: message, results: [] }, { status: 502 });
  }
}
