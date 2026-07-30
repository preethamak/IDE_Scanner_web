import { NextResponse } from "next/server";
import { authenticated } from "@/lib/auth";
import { asUuid, requireTeamRole, teamRole } from "@/lib/teams";
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
  try {
    const { user } = await authenticated(request); const { id } = await context.params;
    await requireTeamRole(id, user.id, ["owner", "admin"]);
    const body = await request.json(); const userId = asUuid(body.user_id); const role = teamRole(body.role);
    if (!userId || !role || role === "owner") return NextResponse.json({ error: "A user id and non-owner role are required." }, { status: 400 });
    const { data, error } = await serviceDb().from("team_members").upsert({ team_id: id, user_id: userId, role }).select("user_id,role").single();
    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Member update failed." }, { status: 403 }); }
}
