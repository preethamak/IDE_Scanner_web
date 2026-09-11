import { NextResponse } from "next/server";
import { authenticated, AuthenticationError } from "@/lib/auth";
import { serviceDb } from "@/lib/supabase";
import { newId, nowIso, privateDb } from "@/lib/cloudflarePrivate";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { user, provider } = await authenticated(request);
    if (provider === "cloudflare") {
      const rows = await privateDb().prepare("SELECT t.id,t.name,t.slug,t.created_at,m.role FROM app_team_members m JOIN app_teams t ON t.id=m.team_id WHERE m.user_id=? ORDER BY t.created_at").bind(user.id).all<Record<string, unknown>>();
      return NextResponse.json({ teams: rows.results.map((row) => ({ id: String(row.id), name: String(row.name), slug: String(row.slug), created_at: String(row.created_at), role: String(row.role) })) });
    }
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
    const { user, provider } = await authenticated(request);
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim().slice(0, 80) : "";
    if (!name) return NextResponse.json({ error: "A team name is required." }, { status: 400 });
    if (provider === "cloudflare") {
      const db = privateDb();
      if (body.onboarding === true) {
        const existing = await db.prepare("SELECT t.id,t.name,t.slug,t.created_at FROM app_team_members m JOIN app_teams t ON t.id=m.team_id WHERE m.user_id=? AND m.role='owner' ORDER BY t.created_at LIMIT 1").bind(user.id).first<Record<string, unknown>>();
        if (existing) return NextResponse.json({ id: String(existing.id), name: String(existing.name), slug: String(existing.slug), created_at: String(existing.created_at), role: "owner", reused: true });
      }
      const id = newId();
      const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "team"}-${id.slice(0, 6)}`;
      const createdAt = nowIso();
      await db.batch([
        db.prepare("INSERT INTO app_teams(id,name,slug,created_by,created_at) VALUES(?,?,?,?,?)").bind(id, name, slug, user.id, createdAt),
        db.prepare("INSERT INTO app_team_members(team_id,user_id,role,created_at) VALUES(?,?,?,?)").bind(id, user.id, "owner", createdAt),
        db.prepare("INSERT INTO app_team_state(team_id,state_json,updated_at) VALUES(?,?,?)").bind(id, JSON.stringify({}), createdAt),
      ]);
      return NextResponse.json({ id, name, slug, created_at: createdAt, role: "owner" }, { status: 201 });
    }
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
