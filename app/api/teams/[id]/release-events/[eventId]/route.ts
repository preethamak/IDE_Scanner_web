import { NextResponse } from "next/server";
import { authenticated } from "@/lib/auth";
import { asUuid, requireTeamRole } from "@/lib/teams";
import { serviceDb } from "@/lib/supabase";

export async function GET(request: Request, context: { params: Promise<{ id: string; eventId: string }> }) {
  try {
    const { user } = await authenticated(request); const { id, eventId } = await context.params;
    await requireTeamRole(id, user.id, ["owner", "admin", "analyst", "viewer"]);
    if (!asUuid(eventId)) return NextResponse.json({ error: "A valid release event id is required." }, { status: 400 });
    const { data, error } = await serviceDb().from("team_release_events").select("id,team_id,extension_id,baseline_scan_id,target_scan_id,baseline_version,target_version,state,materiality,error,created_at,updated_at").eq("id", eventId).eq("team_id", id).maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Release event not found." }, { status: 404 });
    return NextResponse.json({ event: data, comparison_available: data.state === "comparison_ready" && Boolean(data.baseline_scan_id && data.target_scan_id) });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Release event lookup failed." }, { status: 403 }); }
}
