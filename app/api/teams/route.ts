import { NextResponse } from "next/server";
import { authenticated } from "@/lib/auth";
import { serviceDb } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { user } = await authenticated(request);
    const { data, error } = await serviceDb().from("team_members").select("role,teams(id,name,slug,created_at)").eq("user_id", user.id).order("created_at", { referencedTable: "teams" });
    if (error) throw error;
    return NextResponse.json({ teams: (data || []).map((row) => ({ ...(Array.isArray(row.teams) ? row.teams[0] : row.teams), role: row.role })).filter((team) => team.id) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Team lookup failed." }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const { user } = await authenticated(request);
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim().slice(0, 80) : "";
    if (!name) return NextResponse.json({ error: "A team name is required." }, { status: 400 });
    const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "team"}-${crypto.randomUUID().slice(0, 6)}`;
    const db = serviceDb();
    const { data: team, error } = await db.from("teams").insert({ name, slug, created_by: user.id }).select("id,name,slug,created_at").single();
    if (error) throw error;
    const membership = await db.from("team_members").insert({ team_id: team.id, user_id: user.id, role: "owner" });
    if (membership.error) {
      await db.from("teams").delete().eq("id", team.id);
      throw membership.error;
    }
    return NextResponse.json({ ...team, role: "owner" }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Team creation failed." }, { status: 400 });
  }
}
