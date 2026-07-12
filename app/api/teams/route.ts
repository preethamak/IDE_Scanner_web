import { NextResponse } from "next/server";
import { authenticated } from "@/lib/auth";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try { const { db, user } = await authenticated(request); const memberships = await db.from("team_members").select("team_id,role,teams(*)").eq("user_id", user.id); if (memberships.error) throw memberships.error; return NextResponse.json({ teams: memberships.data }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Team lookup failed." }, { status: 401 }); }
}
export async function POST(request: Request) {
  try { const { db } = await authenticated(request); const body = await request.json(); const name = String(body.name || "").trim().slice(0, 80); if (!name) throw new Error("Team name is required."); const team = await db.rpc("create_team", { team_name: name }); if (team.error) throw team.error; return NextResponse.json(team.data, { status: 201 }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Team creation failed." }, { status: 400 }); }
}
