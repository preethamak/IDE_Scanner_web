import { NextResponse } from "next/server";
import { authenticated } from "@/lib/auth";
import { serviceDb } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try { const { db, user } = await authenticated(request); const memberships = await db.from("team_members").select("team_id,role,teams(*)").eq("user_id", user.id); if (memberships.error) throw memberships.error; return NextResponse.json({ teams: memberships.data }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Team lookup failed." }, { status: 401 }); }
}
export async function POST(request: Request) {
  try { const { user } = await authenticated(request); const body = await request.json(); const name = String(body.name || "").trim().slice(0, 80); if (!name) throw new Error("Team name is required."); const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${crypto.randomUUID().slice(0, 6)}`; const admin = serviceDb(); const team = await admin.from("teams").insert({ name, slug, created_by: user.id }).select().single(); if (team.error) throw team.error; const membership = await admin.from("team_members").insert({ team_id: team.data.id, user_id: user.id, role: "owner" }); if (membership.error) throw membership.error; return NextResponse.json(team.data, { status: 201 }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Team creation failed." }, { status: 400 }); }
}
