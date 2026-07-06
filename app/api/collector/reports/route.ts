import { NextResponse } from "next/server";
import { saveAgentReport } from "@/lib/agentReports";
import { buildCollectorReport, type CollectorExtension } from "@/lib/collectorReport";

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

  const payload = await request.json().catch(() => null) as { agent?: unknown; extensions?: unknown } | null;
  const extensions = Array.isArray(payload?.extensions) ? payload.extensions as CollectorExtension[] : [];
  const { report, summary } = buildCollectorReport(extensions);

  try {
    const saved = await saveAgentReport({
      agent: payload?.agent,
      summary,
      report,
    });
    return NextResponse.json({
      id: saved.id,
      status: "complete",
      source: "agent",
      createdAt: saved.createdAt,
      total_extensions: summary.summary.total_extensions,
      review: summary.action_counts.review,
      clean: summary.action_counts.clean,
      max_risk_score: summary.summary.max_risk_score,
      max_malware_score: summary.summary.max_malware_score,
      report_url: `/api/scans/${saved.id}/report`,
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "invalid collector report" }, { status: 400 });
  }
}
