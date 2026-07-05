import { NextResponse } from "next/server";
import { listAgentReportJobs } from "@/lib/agentReports";
import { listJobs } from "@/lib/jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const scans = [
    ...listJobs(),
    ...(await listAgentReportJobs())
  ].sort((a, b) => b.createdAt - a.createdAt);
  return NextResponse.json({ scans });
}
