import { NextResponse } from "next/server";
import { getJob } from "@/lib/jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const job = getJob(id);
  if (!job) {
    return NextResponse.json({ error: "scan not found" }, { status: 404 });
  }
  if (!job.report) {
    return NextResponse.json({ error: "report is not ready" }, { status: 409 });
  }
  return NextResponse.json(job.report);
}
