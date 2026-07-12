import { NextResponse } from "next/server";
import { readAgentReport } from "@/lib/agentReports";
import { getJob } from "@/lib/jobs";
import { hasScannerService, scannerServiceRequest } from "@/lib/scannerService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (id.startsWith("job_") && hasScannerService()) {
    try {
      return NextResponse.json(await scannerServiceRequest<Record<string, unknown>>(`/v1/reports/${encodeURIComponent(id)}`));
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Scan report is not ready" }, { status: 502 });
    }
  }
  const agentReport = await readAgentReport(id);
  if (agentReport) {
    return NextResponse.json(agentReport.report);
  }

  const job = getJob(id);
  if (!job) {
    return NextResponse.json({ error: "scan not found" }, { status: 404 });
  }
  if (!job.report) {
    return NextResponse.json({ error: "report is not ready" }, { status: 409 });
  }
  return NextResponse.json(job.report);
}
