import { NextResponse } from "next/server";
import { createJob, latestCompleteReport, publicJob, setCompleteJob, updateJob } from "@/lib/jobs";
import { isPythonBridgeUnavailable, localScannerUnavailableMessage, runPythonBridge } from "@/lib/pythonBridge";
import type { ReportSummary } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ScanPayload = {
  extension_paths?: unknown;
  paths?: unknown;
  online?: unknown;
  sandbox?: unknown;
  allow_execute?: unknown;
  compare_previous?: unknown;
};

type BridgeScanResult = {
  summary: ReportSummary;
  report: unknown;
};

export async function POST(request: Request) {
  const payload = await request.json().catch(() => ({})) as ScanPayload;
  const paths = payload.extension_paths || payload.paths;

  if (!Array.isArray(paths) || paths.some((item) => typeof item !== "string")) {
    return NextResponse.json({ error: "extension_paths must be a list of strings" }, { status: 400 });
  }
  if (paths.length === 0) {
    return NextResponse.json({ error: "select at least one extension" }, { status: 400 });
  }

  const job = createJob();
  void runScan(job.id, {
    extension_paths: paths,
    online: Boolean(payload.online),
    sandbox: Boolean(payload.sandbox),
    allow_execute: Boolean(payload.allow_execute),
    previous_report: payload.compare_previous === false ? null : latestCompleteReport()
  });

  return NextResponse.json(publicJob(job), { status: 202 });
}

async function runScan(jobId: string, payload: { extension_paths: string[]; online: boolean; sandbox: boolean; allow_execute: boolean; previous_report: unknown | null }) {
  updateJob(jobId, { status: "running" });
  try {
    const result = await runPythonBridge<BridgeScanResult>("scan", payload);
    setCompleteJob(jobId, result.summary, result.report);
  } catch (error) {
    updateJob(jobId, {
      status: "failed",
      error: isPythonBridgeUnavailable(error) ? localScannerUnavailableMessage() : error instanceof Error ? error.message : "Scan failed"
    });
  }
}
