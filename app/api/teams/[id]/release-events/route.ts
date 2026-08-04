import { NextResponse } from "next/server";
import { authenticated } from "@/lib/auth";
import { requireTeamRole } from "@/lib/teams";
import { serviceDb } from "@/lib/supabase";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await authenticated(request); const { id } = await context.params;
    await requireTeamRole(id, user.id, ["owner", "admin", "analyst", "viewer"]);
    const { data, error } = await serviceDb().from("team_release_events").select("id,extension_id,baseline_version,target_version,state,materiality,created_at,updated_at,error,scans!team_release_events_target_scan_id_fkey(decision,severity,coverage_percent)").eq("team_id", id).neq("state", "superseded").order("created_at", { ascending: false }).limit(100);
    if (error) throw error;
    return NextResponse.json({ events: data || [] });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Release-change queue is temporarily unavailable." }, { status: 403 }); }
}
