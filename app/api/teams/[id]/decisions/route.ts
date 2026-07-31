import { NextResponse } from "next/server";
import { authenticated } from "@/lib/auth";
import { asUuid, requireTeamRole, teamDecision } from "@/lib/teams";
import { decisionEventKind, type DecisionSnapshot } from "@/lib/teamDecisionLifecycle";
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
    if (assignedTo) {
      const assignee = await db.from("team_members").select("user_id").eq("team_id", id).eq("user_id", assignedTo).maybeSingle();
      if (assignee.error) throw assignee.error;
      if (!assignee.data) return NextResponse.json({ error: "The assignee must be a member of this team." }, { status: 400 });
    }
    const existing = await db.from("team_decisions").select("*").eq("team_id", id).eq("scan_id", scanId).maybeSingle();
    if (existing.error) throw existing.error;
    const before = existing.data ? snapshot(existing.data) : null;
    const resolvedAt = decision === "review" ? null : before?.resolved_at || new Date().toISOString();
    const after: DecisionSnapshot = { decision, rationale, assigned_to: assignedTo, due_at: dueAt?.toISOString() || null, resolved_at: resolvedAt };
    const payload = { team_id: id, scan_id: scanId, extension_id: scan.extension_id, version: scan.version, ...after, updated_by: user.id };
    const result = existing.data
      ? await db.from("team_decisions").update(payload).eq("id", existing.data.id).select().single()
      : await db.from("team_decisions").insert({ ...payload, created_by: user.id }).select().single();
    const { data, error } = result;
    if (error) throw error;
    const eventKind = decisionEventKind(before, after);
    const event = await db.from("team_decision_events").insert({ decision_id: data.id, actor_id: user.id, kind: eventKind, before_value: before || {}, after_value: after }).select("id").single();
    if (event.error) throw event.error;
    const alert = await db.from("team_monitoring_alerts").upsert({ team_id: id, extension_id: scan.extension_id, version: scan.version, scan_id: scanId, kind: "decision_changed", severity: null, title: `Team decision ${decision}: ${scan.extension_id}@${scan.version}`, summary: `A team member ${eventKind === "assigned" ? "changed ownership" : "updated the recorded decision"}.`, metadata: { decision, assigned_to: assignedTo, due_at: after.due_at, decision_event_id: event.data.id }, dedupe_key: `decision:${event.data.id}` }, { onConflict: "team_id,dedupe_key", ignoreDuplicates: true });
    if (alert.error) throw alert.error;
    return NextResponse.json(data, { status: existing.data ? 200 : 201 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Decision update failed." }, { status: 400 }); }
}

function snapshot(value: Record<string, unknown>): DecisionSnapshot {
  const decision = teamDecision(value.decision);
  if (!decision) throw new Error("Stored decision is invalid.");
  return {
    decision,
    rationale: typeof value.rationale === "string" ? value.rationale : "",
    assigned_to: typeof value.assigned_to === "string" ? value.assigned_to : null,
    due_at: typeof value.due_at === "string" ? value.due_at : null,
    resolved_at: typeof value.resolved_at === "string" ? value.resolved_at : null,
  };
}
