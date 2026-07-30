import { NextResponse } from "next/server";
import { authenticated } from "@/lib/auth";
import { requireTeamRole } from "@/lib/teams";
import { serviceDb } from "@/lib/supabase";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await authenticated(request); const { id } = await context.params;
    await requireTeamRole(id, user.id, ["owner", "admin", "analyst", "viewer"]);
    const { data, error } = await serviceDb().from("team_members").select("user_id,role,profiles(display_name)").eq("team_id", id).order("role");
    if (error) throw error;
    return NextResponse.json({ members: data || [] });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Member lookup failed." }, { status: 403 }); }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  void request; void context;
  return NextResponse.json({ error: "Create an expiring invitation instead of adding a member by user id." }, { status: 405, headers: { Allow: "GET" } });
}
