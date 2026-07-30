import { NextResponse } from "next/server";
import { authenticated } from "@/lib/auth";
import { asUuid, requireTeamRole, teamDecision } from "@/lib/teams";
import { serviceDb } from "@/lib/supabase";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await authenticated(request); const { id } = await context.params;
    await requireTeamRole(id, user.id, ["owner", "admin", "analyst", "viewer"]);
    const { data, error } = await serviceDb().from("team_decisions").select("*,team_decision_events(*)").eq("team_id", id).order("updated_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ decisions: data || [] });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Decision lookup failed." }, { status: 403 }); }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await authenticated(request); const { id } = await context.params;
    await requireTeamRole(id, user.id, ["owner", "admin", "analyst"]);
    const body = await request.json(); const scanId = asUuid(body.scan_id); const decision = teamDecision(body.decision);
    if (!scanId || !decision) return NextResponse.json({ error: "A scan id and valid decision are required." }, { status: 400 });
    const db = serviceDb(); const { data: scan, error: scanError } = await db.from("scans").select("extension_id,version").eq("id", scanId).maybeSingle();
    if (scanError) throw scanError;
    if (!scan) return NextResponse.json({ error: "Scan not found." }, { status: 404 });
    const rationale = typeof body.rationale === "string" ? body.rationale.trim().slice(0, 4000) : "";
    const assignedTo = body.assigned_to == null ? null : asUuid(body.assigned_to);
    const dueAt = body.due_at == null ? null : new Date(String(body.due_at));
    if (body.assigned_to != null && !assignedTo) return NextResponse.json({ error: "Invalid assignee." }, { status: 400 });
    if (dueAt && Number.isNaN(dueAt.getTime())) return NextResponse.json({ error: "Invalid due date." }, { status: 400 });
    const payload = { team_id: id, scan_id: scanId, extension_id: scan.extension_id, version: scan.version, decision, rationale, assigned_to: assignedTo, due_at: dueAt?.toISOString() || null, created_by: user.id, updated_by: user.id, resolved_at: decision === "review" ? null : new Date().toISOString() };
    const { data, error } = await db.from("team_decisions").upsert(payload, { onConflict: "team_id,scan_id" }).select().single();
    if (error) throw error;
    const event = await db.from("team_decision_events").insert({ decision_id: data.id, actor_id: user.id, kind: "created", after_value: { decision, rationale, assigned_to: assignedTo, due_at: payload.due_at } });
    if (event.error) throw event.error;
    return NextResponse.json(data, { status: 201 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Decision update failed." }, { status: 400 }); }
}
