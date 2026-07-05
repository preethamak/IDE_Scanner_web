import { NextResponse } from "next/server";
import { findExtensionInLatestReport } from "@/lib/jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const result = findExtensionInLatestReport(id);
  if (!result) {
    return NextResponse.json({ error: "extension not found in latest completed report" }, { status: 404 });
  }
  return NextResponse.json(result);
}
