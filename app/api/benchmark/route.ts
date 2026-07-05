import { NextResponse } from "next/server";
import { runPythonBridge } from "@/lib/pythonBridge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await runPythonBridge("benchmark");
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Benchmark failed" },
      { status: 500 }
    );
  }
}
