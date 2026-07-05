import { NextResponse } from "next/server";
import { runPythonBridge } from "@/lib/pythonBridge";
import type { InventoryResponse } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const inventory = await runPythonBridge<InventoryResponse>("inventory");
    return NextResponse.json(inventory);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Inventory failed" }, { status: 500 });
  }
}
