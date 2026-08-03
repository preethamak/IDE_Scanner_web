import { NextResponse } from "next/server";
import { authenticated } from "@/lib/auth";
import { requireTeamRole } from "@/lib/teams";
import { serviceDb } from "@/lib/supabase";
import { teamApiError } from "@/lib/teamApiError";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await authenticated(request); const { id } = await context.params;
    await requireTeamRole(id, user.id, ["owner", "admin", "analyst", "viewer"]);
    const db = serviceDb();
    const { data, error } = await db.from("team_members").select("user_id,role").eq("team_id", id).order("role");
    if (error) throw error;
    const memberIds = (data || []).map((member) => member.user_id);
    const { data: profiles, error: profilesError } = memberIds.length
      ? await db.from("profiles").select("id,display_name").in("id", memberIds)
      : { data: [], error: null };
    if (profilesError) throw profilesError;
    const names = new Map((profiles || []).map((profile) => [profile.id, profile.display_name]));
    return NextResponse.json({ members: (data || []).map((member) => ({ ...member, profiles: { display_name: names.get(member.user_id) || null } })) });
  } catch (error) {
    const failure = teamApiError(error, "Team members are temporarily unavailable. Please try again.");
    return NextResponse.json({ error: failure.error }, { status: failure.status });
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  void request; void context;
  return NextResponse.json({ error: "Create an expiring invitation instead of adding a member by user id." }, { status: 405, headers: { Allow: "GET" } });
}
