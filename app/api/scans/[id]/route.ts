import { NextResponse } from "next/server";
import { agentReportToJob, readAgentReport } from "@/lib/agentReports";
import { getJob, publicJob } from "@/lib/jobs";
import { hasScannerService, scannerServiceRequest } from "@/lib/scannerService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (id.startsWith("job_") && hasScannerService()) {
    try {
      const job = await scannerServiceRequest<Record<string, unknown>>(`/v1/jobs/${encodeURIComponent(id)}`);
      return NextResponse.json({ ...job, analysis_level: "deep" });
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Scan job failed" }, { status: 502 });
    }
  }
  const agentReport = await readAgentReport(id);
  if (agentReport) {
    return NextResponse.json(agentReportToJob(agentReport));
  }

  const job = getJob(id);
  if (!job) {
    return NextResponse.json({ error: "scan not found" }, { status: 404 });
  }
  return NextResponse.json(publicJob(job));
}
