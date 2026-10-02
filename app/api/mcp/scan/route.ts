import { NextResponse } from "next/server";
import { localScannerEnabled, runPythonBridge } from "@/lib/pythonBridge";
import { dispatchGithubMcpScan, getGithubMcpScan, githubMcpScanConfigured } from "@/lib/githubMcpScan";
import { runtimeEnv } from "@/lib/runtimeEnv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 512 * 1024;
const REMOTE_TIMEOUT_MS = 120_000;

export async function GET(request: Request) {
  const requestId = new URL(request.url).searchParams.get("request_id") || "";
  try {
    const status = await getGithubMcpScan(requestId);
    return NextResponse.json(status, { status: status.status === "failed" ? 502 : 200, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "MCP assessment status lookup failed." }, { status: 502 });
  }
}

export async function POST(request: Request) {
  const localEnabled = localScannerEnabled();
  const remoteScannerUrl = runtimeEnv("MCP_SCANNER_URL").trim().replace(/\/$/, "");
  const githubRunnerEnabled = !localEnabled && !remoteScannerUrl && githubMcpScanConfigured();
  if (!localEnabled && !remoteScannerUrl && !githubRunnerEnabled) return NextResponse.json({ error: "MCP assessment is not configured on this deployment." }, { status: 503 });
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
    if (githubRunnerEnabled) {
      const queued = await dispatchGithubMcpScan(raw);
      return NextResponse.json(queued, { status: 202, headers: { "Cache-Control": "no-store" } });
    }
    const report = localEnabled ? await runPythonBridge<Record<string, unknown>>("mcp_scan", payload) : await runRemoteScanner(remoteScannerUrl, raw);
    return NextResponse.json(report, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "MCP assessment failed." }, { status: 502 });
  }
}

async function runRemoteScanner(baseUrl: string, raw: string): Promise<Record<string, unknown>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REMOTE_TIMEOUT_MS);
  const remoteToken = runtimeEnv("MCP_SCANNER_TOKEN").trim();
  try {
    const response = await fetch(`${baseUrl}/v1/scans/mcp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(remoteToken ? { Authorization: `Bearer ${remoteToken}` } : {}),
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
