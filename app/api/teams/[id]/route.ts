import { NextResponse } from "next/server";
import { authenticated } from "@/lib/auth";

export const dynamic = "force-dynamic";
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try { const { db } = await authenticated(request); const { id } = await context.params; const [team, members, watchlist, triage] = await Promise.all([db.from("teams").select("*").eq("id", id).single(), db.from("team_members").select("user_id,role,profiles(display_name)").eq("team_id", id), db.from("team_watchlist_items").select("extension_id,created_at,extensions(display_name,publisher,icon_url)").eq("team_id", id), db.from("finding_triage").select("*,findings(rule_id,severity,summary,recommendation)").eq("team_id", id).order("updated_at", { ascending: false })]); if (team.error) throw team.error; return NextResponse.json({ team: team.data, members: members.data || [], watchlist: watchlist.data || [], triage: triage.data || [] }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Team lookup failed." }, { status: 403 }); }
}
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try { const { db, user } = await authenticated(request); const { id } = await context.params; const body = await request.json(); const extensionId = String(body.extension_id || ""); if (!extensionId) throw new Error("extension_id is required."); const result = await db.from("team_watchlist_items").upsert({ team_id: id, extension_id: extensionId, created_by: user.id }); if (result.error) throw result.error; return NextResponse.json({ ok: true }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Team watchlist update failed." }, { status: 400 }); }
}
