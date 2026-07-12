import { NextResponse } from "next/server";
import { authenticated } from "@/lib/auth";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try { const { db, user } = await authenticated(request); const { id } = await context.params; const body = await request.json(); const text = String(body.body || "").trim(); if (!text) throw new Error("Comment cannot be empty."); const result = await db.from("finding_comments").insert({ team_id: id, scan_id: String(body.scan_id || ""), finding_id: String(body.finding_id || ""), author_id: user.id, body: text }).select().single(); if (result.error) throw result.error; return NextResponse.json(result.data, { status: 201 }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Comment creation failed." }, { status: 400 }); }
}
