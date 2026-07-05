import { NextResponse } from "next/server";
import { agentReportToJob, saveAgentReport } from "@/lib/agentReports";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const expectedToken = process.env.IDE_SCANNER_AGENT_TOKEN;
  if (expectedToken) {
    const header = request.headers.get("authorization") || "";
    if (header !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const payload = await request.json().catch(() => null);
  try {
    const report = await saveAgentReport(payload);
    return NextResponse.json(agentReportToJob(report), { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "invalid agent report" },
      { status: 400 }
    );
  }
}
