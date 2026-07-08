import { randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { NextResponse } from "next/server";
import { createJob, latestCompleteReport, publicJob, setCompleteJob, updateJob } from "@/lib/jobs";
import { isPythonBridgeUnavailable, localScannerUnavailableMessage, runPythonBridge } from "@/lib/pythonBridge";
import type { ReportSummary } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type BridgeScanResult = {
  summary: ReportSummary;
  report: unknown;
};

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set([".vsix", ".zip"]);

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Attach a .vsix or .zip package" }, { status: 400 });
  }

  const extension = path.extname(file.name).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(extension)) {
    return NextResponse.json({ error: "Only .vsix or .zip packages are accepted" }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "Uploaded file is empty" }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: `File exceeds the ${Math.floor(MAX_UPLOAD_BYTES / (1024 * 1024))}MB upload limit` }, { status: 400 });
  }

  const uploadDir = path.join(tmpdir(), "ide-scanner-web-uploads");
  await mkdir(uploadDir, { recursive: true });
  const savedPath = path.join(uploadDir, `${randomUUID()}${extension}`);
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(savedPath, bytes);

  const job = createJob();
  // Uploaded packages are attacker-controlled by construction (arbitrary
  // visitor upload). Sandbox/allow_execute are hardcoded false here so a
  // request can never trigger dynamic execution of an uploaded package on
  // shared server infra -- only the static scan_vsix/scan_targets path runs.
  void runScan(job.id, savedPath, {
    extension_paths: [savedPath],
    marketplace_ids: [],
    online: true,
    sandbox: false,
    allow_execute: false,
    include_posture: false,
    previous_report: latestCompleteReport()
  });

  return NextResponse.json(publicJob(job), { status: 202 });
}

async function runScan(
  jobId: string,
  savedPath: string,
  payload: { extension_paths: string[]; marketplace_ids: string[]; online: boolean; sandbox: boolean; allow_execute: boolean; include_posture: boolean; previous_report: unknown | null }
) {
  updateJob(jobId, { status: "running" });
  try {
    const result = await runPythonBridge<BridgeScanResult>("scan", payload);
    setCompleteJob(jobId, result.summary, result.report);
  } catch (error) {
    updateJob(jobId, {
      status: "failed",
      error: isPythonBridgeUnavailable(error) ? localScannerUnavailableMessage() : error instanceof Error ? error.message : "Package scan failed"
    });
  } finally {
    await rm(savedPath, { force: true }).catch(() => undefined);
  }
}
