import { NextResponse } from "next/server";
import { authenticated, AuthenticationError } from "@/lib/auth";
import { serviceDb } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { user } = await authenticated(request);
    const { data, error } = await serviceDb().from("team_members").select("role,teams(id,name,slug,created_at)").eq("user_id", user.id).order("created_at", { referencedTable: "teams" });
    if (error) throw error;
    return NextResponse.json({ teams: (data || []).map((row) => ({ ...(Array.isArray(row.teams) ? row.teams[0] : row.teams), role: row.role })).filter((team) => team.id) });
  } catch (error) {
    if (error instanceof AuthenticationError) return NextResponse.json({ error: error.message }, { status: 401 });
    return NextResponse.json({ error: "The workspace service is temporarily unavailable. Please try again." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const { user } = await authenticated(request);
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim().slice(0, 80) : "";
    if (!name) return NextResponse.json({ error: "A team name is required." }, { status: 400 });
    const db = serviceDb();
    // Onboarding retries are common after an interrupted network response. The
    // first owner workspace is the durable outcome, so return it rather than
    // creating a duplicate team on a retry.
    if (body.onboarding === true) {
      const existing = await db.from("team_members").select("role,teams(id,name,slug,created_at)").eq("user_id", user.id).eq("role", "owner").order("created_at", { referencedTable: "teams" }).limit(1).maybeSingle();
      if (existing.error) throw existing.error;
      const team = Array.isArray(existing.data?.teams) ? existing.data?.teams[0] : existing.data?.teams;
      if (team?.id) return NextResponse.json({ ...team, role: "owner", reused: true });
    }
    const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "team"}-${crypto.randomUUID().slice(0, 6)}`;
    const { data: team, error } = await db.from("teams").insert({ name, slug, created_by: user.id }).select("id,name,slug,created_at").single();
    if (error) throw error;
    const membership = await db.from("team_members").insert({ team_id: team.id, user_id: user.id, role: "owner" });
    if (membership.error) {
      await db.from("teams").delete().eq("id", team.id);
      throw membership.error;
    }
    return NextResponse.json({ ...team, role: "owner" }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthenticationError) return NextResponse.json({ error: error.message }, { status: 401 });
    return NextResponse.json({ error: "The workspace could not be created. Please try again." }, { status: 503 });
  }
}
