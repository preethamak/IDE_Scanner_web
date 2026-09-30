import { NextResponse } from "next/server";
import { localScannerEnabled, runPythonBridge } from "@/lib/pythonBridge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 512 * 1024;
const REMOTE_TIMEOUT_MS = 120_000;

export async function POST(request: Request) {
  const localEnabled = localScannerEnabled();
  const remoteScannerUrl = String(process.env.MCP_SCANNER_URL || "").trim().replace(/\/$/, "");
  if (!localEnabled && !remoteScannerUrl) return NextResponse.json({ error: "MCP assessment is not configured on this deployment." }, { status: 503 });
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
    const report = localEnabled
      ? await runPythonBridge<Record<string, unknown>>("mcp_scan", payload)
      : await runRemoteScanner(remoteScannerUrl, raw);
    return NextResponse.json(report, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "MCP assessment failed." }, { status: 502 });
  }
}

async function runRemoteScanner(baseUrl: string, raw: string): Promise<Record<string, unknown>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REMOTE_TIMEOUT_MS);
  try {
    const response = await fetch(`${baseUrl}/v1/scans/mcp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.MCP_SCANNER_TOKEN ? { Authorization: `Bearer ${process.env.MCP_SCANNER_TOKEN}` } : {}),
      },
      body: raw,
      cache: "no-store",
      signal: controller.signal,
    });
    const body = await response.json().catch(() => ({})) as Record<string, unknown>;
    if (!response.ok) throw new Error(String(body.error || `MCP scanner returned ${response.status}.`));
    return body;
  } finally {
    clearTimeout(timeout);
  }
}
