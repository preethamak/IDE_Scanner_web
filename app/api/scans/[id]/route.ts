import { NextResponse } from "next/server";
import { agentReportToJob, readAgentReport } from "@/lib/agentReports";
import { getJob, publicJob } from "@/lib/jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
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
