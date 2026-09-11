import { NextResponse } from "next/server";
import { authenticated } from "@/lib/auth";
import { asUuid, requireTeamRole, teamDecision } from "@/lib/teams";
import { teamApiError } from "@/lib/teamApiError";
import { serviceDb } from "@/lib/supabase";
import { getWorkspaceState, saveState } from "@/lib/cloudflareWorkspace";
import { newId, nowIso, privateDb } from "@/lib/cloudflarePrivate";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { user, provider } = await authenticated(request);
    const { id } = await context.params;
    await requireTeamRole(id, user.id, ["owner", "admin", "analyst", "viewer"]);
    if (provider === "cloudflare") return NextResponse.json({ decisions: (await getWorkspaceState(id)).decisions });
    const { data, error } = await serviceDb()
      .from("team_decisions")
      .select(
        "*,team_decision_events(*),scans(capabilities,capability_assessment,analysis_status,scanned_at,artifact_sha256)",
      )
      .eq("team_id", id)
      .order("updated_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    return NextResponse.json({ decisions: data || [] });
  } catch (error) {
    const failure = teamApiError(error, "Decision lookup failed.");
    return NextResponse.json({ error: failure.error }, { status: failure.status });
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { user, provider } = await authenticated(request);
    const { id } = await context.params;
    await requireTeamRole(id, user.id, ["owner", "admin", "analyst"]);
    const body = await request.json();
    const scanId = asUuid(body.scan_id);
    const decision = teamDecision(body.decision);
    if (!scanId || !decision)
      return NextResponse.json(
        { error: "A scan id and valid decision are required." },
        { status: 400 },
      );
    if (provider === "cloudflare") {
      const scan = await privateDb().prepare("SELECT extension_id,version FROM app_scan_reports WHERE scan_id=?").bind(scanId).first<Record<string, unknown>>();
      if (!scan) return NextResponse.json({ error: "Scan not found." }, { status: 404 });
      const rationale = typeof body.rationale === "string" ? body.rationale.trim().slice(0, 4000) : "";
      const dueAt = body.due_at == null ? null : new Date(String(body.due_at));
      if (dueAt && Number.isNaN(dueAt.getTime())) return NextResponse.json({ error: "Invalid due date." }, { status: 400 });
      const workspace = await getWorkspaceState(id);
      const existing = workspace.decisions.find((item) => String(item.scan_id) === scanId);
      const now = nowIso();
      const record = existing || { id: newId(), scan_id: scanId, extension_id: String(scan.extension_id), version: String(scan.version), assigned_to: body.assigned_to || null, created_at: now };
      Object.assign(record, { decision, rationale, due_at: dueAt?.toISOString() || null, resolved_at: decision === "review" ? null : now, updated_at: now, team_id: id });
      workspace.decisions = [record, ...workspace.decisions.filter((item) => item !== existing)];
      workspace.audit.unshift({ event_id: newId(), workspace_id: id, actor_id: user.id, action: "decision_updated", object_type: "decision", object_id: String(record.id), extension_id: record.extension_id, version: record.version, previous_state: null, resulting_state: { decision, rationale }, rationale, risk_level: null, receipt_id: newId(), occurred_at: now });
      await saveState(id, workspace);
      return NextResponse.json({ ...record, audit_receipt: { id: String(record.id), action: "decision_updated", recorded_at: now } }, { status: existing ? 200 : 201 });
    }
    const db = serviceDb();
    const { data: scan, error: scanError } = await db
      .from("scans")
      .select("extension_id,version")
      .eq("id", scanId)
      .maybeSingle();
    if (scanError) throw scanError;
    if (!scan)
      return NextResponse.json({ error: "Scan not found." }, { status: 404 });
    const rationale =
      typeof body.rationale === "string"
        ? body.rationale.trim().slice(0, 4000)
        : "";
    const assignedTo =
      body.assigned_to == null ? null : asUuid(body.assigned_to);
    const dueAt = body.due_at == null ? null : new Date(String(body.due_at));
    if (body.assigned_to != null && !assignedTo)
      return NextResponse.json({ error: "Invalid assignee." }, { status: 400 });
    if (dueAt && Number.isNaN(dueAt.getTime()))
      return NextResponse.json({ error: "Invalid due date." }, { status: 400 });
    if (assignedTo) {
      const assignee = await db
        .from("team_members")
        .select("user_id")
        .eq("team_id", id)
        .eq("user_id", assignedTo)
        .maybeSingle();
      if (assignee.error) throw assignee.error;
      if (!assignee.data)
        return NextResponse.json(
          { error: "The assignee must be a member of this team." },
          { status: 400 },
        );
    }
    const { data, error } = await db.rpc("record_team_decision_atomically", {
      target_team: id,
      actor: user.id,
      target_scan: scanId,
      desired_decision: decision,
      decision_rationale: rationale,
      desired_assignee: assignedTo,
      desired_due_at: dueAt?.toISOString() || null,
    });
    if (error) throw error;
    const mutation = atomicDecisionMutation(data);
    return NextResponse.json(
      {
        ...mutation.decision,
        audit_receipt: mutation.audit_receipt,
      },
      { status: mutation.created ? 201 : 200 },
    );
  } catch (error) {
    const failure = teamApiError(error, "Decision update failed.");
    return NextResponse.json({ error: failure.error }, { status: failure.status });
  }
}

function atomicDecisionMutation(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Decision mutation returned an invalid response.");
  }
  const mutation = value as Record<string, unknown>;
  const decision = mutation.decision;
  const auditReceipt = mutation.audit_receipt;
  if (
    !decision ||
    typeof decision !== "object" ||
    Array.isArray(decision) ||
    !auditReceipt ||
    typeof auditReceipt !== "object" ||
    Array.isArray(auditReceipt)
  ) {
    throw new Error("Decision mutation returned incomplete evidence.");
  }
  return {
    created: mutation.created === true,
    decision: decision as Record<string, unknown>,
    audit_receipt: auditReceipt as Record<string, unknown>,
  };
}
