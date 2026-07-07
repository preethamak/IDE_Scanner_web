import { NextResponse } from "next/server";
import { isPythonBridgeUnavailable, localScannerUnavailableMessage, runPythonBridge } from "@/lib/pythonBridge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type BridgeRulesResult = {
  ruleset_version: string;
  rules: unknown[];
};

let cache: { at: number; data: BridgeRulesResult } | null = null;
const CACHE_MS = 5 * 60 * 1000;

export async function GET() {
  if (cache && Date.now() - cache.at < CACHE_MS) {
    return NextResponse.json(cache.data);
  }
  try {
    const result = await runPythonBridge<BridgeRulesResult>("rules");
    cache = { at: Date.now(), data: result };
    return NextResponse.json(result);
  } catch (error) {
    const message = isPythonBridgeUnavailable(error) ? localScannerUnavailableMessage() : error instanceof Error ? error.message : "Failed to load rules";
    return NextResponse.json({ error: message, rules: [] }, { status: 502 });
  }
}
