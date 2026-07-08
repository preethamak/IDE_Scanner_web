import { NextResponse } from "next/server";
import { createJob, latestCompleteReport, publicJob, setCompleteJob, updateJob } from "@/lib/jobs";
import { isPythonBridgeUnavailable, localScannerUnavailableMessage, runPythonBridge } from "@/lib/pythonBridge";
import type { ReportSummary } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type MarketplacePayload = {
  ids?: unknown;
  id?: unknown;
  compare_previous?: unknown;
};

type BridgeScanResult = {
  summary: ReportSummary;
  report: unknown;
};

const MAX_IDS = 10;

export async function POST(request: Request) {
  const payload = await request.json().catch(() => ({})) as MarketplacePayload;
  const raw = Array.isArray(payload.ids) ? payload.ids : payload.id !== undefined ? [payload.id] : [];

  if (!Array.isArray(raw) || raw.length === 0 || raw.some((item) => typeof item !== "string")) {
    return NextResponse.json({ error: "Provide a marketplace extension id, item URL, or vscode: URI" }, { status: 400 });
  }

  const ids = (raw as string[]).map((item) => item.trim()).filter(Boolean);
  if (ids.length === 0) {
    return NextResponse.json({ error: "Provide a marketplace extension id, item URL, or vscode: URI" }, { status: 400 });
  }
  if (ids.length > MAX_IDS) {
    return NextResponse.json({ error: `At most ${MAX_IDS} marketplace ids per scan` }, { status: 400 });
  }

  const job = createJob();
  // Hosted marketplace scans are attacker-reachable and run server-side --
  // they are always static-only (scan_vsix under quarantine extraction).
  // sandbox/allow_execute are hardcoded false here, independent of anything
  // the client sends, so this can never be flipped on by a request body.
  void runScan(job.id, {
    marketplace_ids: ids,
    extension_paths: [],
    online: true,
    sandbox: false,
    allow_execute: false,
    include_posture: false,
    previous_report: payload.compare_previous === false ? null : latestCompleteReport()
  });

  return NextResponse.json(publicJob(job), { status: 202 });
}

async function runScan(jobId: string, payload: { marketplace_ids: string[]; extension_paths: string[]; online: boolean; sandbox: boolean; allow_execute: boolean; include_posture: boolean; previous_report: unknown | null }) {
  updateJob(jobId, { status: "running" });
  try {
    const result = await runPythonBridge<BridgeScanResult>("scan", payload);
    setCompleteJob(jobId, result.summary, result.report);
  } catch (error) {
    updateJob(jobId, {
      status: "failed",
      error: isPythonBridgeUnavailable(error) ? localScannerUnavailableMessage() : error instanceof Error ? error.message : "Marketplace scan failed"
    });
  }
}
