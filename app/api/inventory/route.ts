import { NextResponse } from "next/server";
import { isPythonBridgeUnavailable, localScannerEnabled, localScannerUnavailableMessage, runPythonBridge } from "@/lib/pythonBridge";
import type { InventoryResponse } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!localScannerEnabled()) {
    return NextResponse.json({
      error: localScannerUnavailableMessage(),
      code: "LOCAL_SCANNER_UNAVAILABLE"
    }, { status: 503 });
  }
  try {
    const inventory = await runPythonBridge<InventoryResponse>("inventory");
    return NextResponse.json(inventory);
  } catch (error) {
    if (isPythonBridgeUnavailable(error)) {
      return NextResponse.json({
        error: localScannerUnavailableMessage(),
        code: "LOCAL_SCANNER_UNAVAILABLE",
        detail: error instanceof Error ? error.message : undefined
      }, { status: 503 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Inventory failed" }, { status: 500 });
  }
}
