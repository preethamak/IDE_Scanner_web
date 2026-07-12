import { NextResponse } from "next/server";
import { authenticated } from "@/lib/auth";

const statuses = new Set(["open", "reviewing", "accepted_risk", "resolved", "false_positive"]);
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try { const { db, user } = await authenticated(request); const { id } = await context.params; const body = await request.json(); const status = String(body.status || "open"); if (!statuses.has(status)) throw new Error("Invalid triage status."); const row = { team_id: id, scan_id: String(body.scan_id || ""), finding_id: String(body.finding_id || ""), status, assigned_to: body.assigned_to || null, updated_by: user.id, updated_at: new Date().toISOString() }; if (!row.scan_id || !row.finding_id) throw new Error("scan_id and finding_id are required."); const result = await db.from("finding_triage").upsert(row).select().single(); if (result.error) throw result.error; return NextResponse.json(result.data); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Finding triage failed." }, { status: 400 }); }
}
