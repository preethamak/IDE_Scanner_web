import { NextResponse } from "next/server";
import { localScannerEnabled, runPythonBridge } from "@/lib/pythonBridge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 512 * 1024;

export async function POST(request: Request) {
  if (!localScannerEnabled()) {
    return NextResponse.json({ error: "Local MCP assessment is not enabled on this deployment." }, { status: 503 });
  }
  const raw = await request.text().catch(() => null);
  if (raw === null || Buffer.byteLength(raw) > MAX_BYTES) {
    return NextResponse.json({ error: "Assessment input is too large." }, { status: 413 });
  }
  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Assessment input must be valid JSON." }, { status: 400 });
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return NextResponse.json({ error: "Assessment input must be a JSON object." }, { status: 400 });
  }
  try {
    const report = await runPythonBridge<Record<string, unknown>>("mcp_scan", payload);
    return NextResponse.json(report, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Local MCP assessment failed." }, { status: 502 });
  }
}
