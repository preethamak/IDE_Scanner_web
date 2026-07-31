import { NextResponse } from "next/server";
import { authenticated } from "@/lib/auth";
import { requireTeamRole } from "@/lib/teams";
import { serviceDb } from "@/lib/supabase";

const fields = ["release_alerts", "scan_alerts", "decision_alerts", "high_evidence_alerts", "provenance_alerts", "coverage_alerts", "due_alerts"] as const;
type Field = typeof fields[number];
const defaults = Object.fromEntries(fields.map((field) => [field, true])) as Record<Field, boolean>;

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await authenticated(request); const { id } = await context.params;
    await requireTeamRole(id, user.id, ["owner", "admin", "analyst", "viewer"]);
    const { data, error } = await serviceDb().from("team_monitoring_preferences").select("*").eq("team_id", id).maybeSingle();
    if (error) throw error;
    return NextResponse.json({ team_id: id, ...defaults, ...(data || {}) });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Monitoring preferences are unavailable." }, { status: 403 }); }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await authenticated(request); const { id } = await context.params;
    await requireTeamRole(id, user.id, ["owner", "admin"]);
    const body = await request.json(); const patch: Partial<Record<Field, boolean>> = {};
    for (const field of fields) if (field in body) {
      if (typeof body[field] !== "boolean") return NextResponse.json({ error: `${field} must be a boolean.` }, { status: 400 });
      patch[field] = body[field];
    }
    if (!Object.keys(patch).length) return NextResponse.json({ error: "At least one monitoring preference is required." }, { status: 400 });
    const { data, error } = await serviceDb().from("team_monitoring_preferences").upsert({ team_id: id, ...patch, updated_at: new Date().toISOString() }, { onConflict: "team_id" }).select("*").single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Monitoring preferences could not be updated." }, { status: 403 }); }
}
