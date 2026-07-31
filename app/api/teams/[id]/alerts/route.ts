import { NextResponse } from "next/server";
import { authenticated } from "@/lib/auth";
import { requireTeamRole } from "@/lib/teams";
import { serviceDb } from "@/lib/supabase";

const states = new Set(["read", "acknowledged", "dismissed"]);

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await authenticated(request); const { id } = await context.params;
    await requireTeamRole(id, user.id, ["owner", "admin", "analyst", "viewer"]);
    const { data, error } = await serviceDb().from("team_monitoring_alerts").select("*, team_notification_deliveries(status,attempts,delivered_at,last_error,next_attempt_at)").eq("team_id", id).in("state", ["unread", "read", "acknowledged"]).order("created_at", { ascending: false }).limit(100);
    if (error) throw error;
    return NextResponse.json({ alerts: data || [] });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Alert lookup failed." }, { status: 403 }); }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await authenticated(request); const { id } = await context.params;
    await requireTeamRole(id, user.id, ["owner", "admin", "analyst", "viewer"]);
    const body = await request.json(); const state = String(body.state || ""); const alertId = String(body.alert_id || "");
    const dismissalReason = typeof body.dismissal_reason === "string" ? body.dismissal_reason.trim() : "";
    if (!states.has(state) || !/^[0-9a-f-]{36}$/i.test(alertId)) return NextResponse.json({ error: "A valid alert and state are required." }, { status: 400 });
    if (state === "dismissed" && (dismissalReason.length < 1 || dismissalReason.length > 400)) return NextResponse.json({ error: "A dismissal reason between 1 and 400 characters is required." }, { status: 400 });
    const now = new Date().toISOString();
    const patch = { state, read_at: state === "read" ? now : null, resolved_at: state === "acknowledged" || state === "dismissed" ? now : null, dismissal_reason: state === "dismissed" ? dismissalReason : null };
    const { data, error } = await serviceDb().from("team_monitoring_alerts").update(patch).eq("id", alertId).eq("team_id", id).select("id,state,read_at,resolved_at,dismissal_reason").maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Alert not found." }, { status: 404 });
    return NextResponse.json(data);
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Alert update failed." }, { status: 403 }); }
}
