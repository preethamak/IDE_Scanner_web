import { NextResponse } from "next/server";
import { authenticated } from "@/lib/auth";
import { getCloudflareScanProduct } from "@/lib/cloudflareDeepScan";
import { getWorkspaceState, saveState } from "@/lib/cloudflareWorkspace";
import { newId, nowIso, privateDb } from "@/lib/cloudflarePrivate";
import { requireTeamRole } from "@/lib/teams";
import { serviceDb } from "@/lib/supabase";
import { teamApiError } from "@/lib/teamApiError";
import {
  compareCapabilitySnapshots,
  isRecallTransitionAllowed,
  normalizeArtifactIdentity,
  recallImpact,
  recallStates,
  type ArtifactIdentity,
  type CapabilityDelta,
  type InventoryInstallation,
} from "@/lib/trustLedger";

type Context = { params: Promise<{ id: string }> };
type ScanEvidence = { extension_id: string; version: string; artifact_sha256: string; analysis_status: string; coverage_percent: number; capabilities: Record<string, unknown> };

export async function GET(request: Request, context: Context) {
  try {
    const { user, provider } = await authenticated(request);
    const { id } = await context.params;
    await requireTeamRole(id, user.id, ["owner", "admin", "analyst", "viewer"]);
    if (provider === "cloudflare") {
      const state = await getWorkspaceState(id);
      return NextResponse.json({ records: state.trust_records, recalls: state.recall_events });
    }
    const db = serviceDb();
    const [records, recalls] = await Promise.all([
      db.from("team_artifact_trust_records").select("*").eq("team_id", id).order("created_at", { ascending: false }).limit(500),
      db.from("team_recall_events").select("*").eq("team_id", id).order("created_at", { ascending: false }).limit(500),
    ]);
    if (records.error) throw records.error;
    if (recalls.error) throw recalls.error;
    return NextResponse.json({ records: records.data || [], recalls: recalls.data || [] });
  } catch (error) {
    const failure = teamApiError(error, "The trust ledger is temporarily unavailable.");
    return NextResponse.json({ error: failure.error }, { status: failure.status });
  }
}

export async function POST(request: Request, context: Context) {
  try {
    const { user, provider } = await authenticated(request);
    const { id } = await context.params;
    await requireTeamRole(id, user.id, ["owner", "admin", "analyst"]);
    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const action = String(body.action || "");
    if (action === "approve") return await approve(id, user.id, provider, body);
    if (action === "recall") return await recall(id, user.id, provider, body);
    return NextResponse.json({ error: "Action must be approve or recall." }, { status: 400 });
  } catch (error) {
    const failure = teamApiError(error, "The trust ledger update failed.");
    return NextResponse.json({ error: failure.error }, { status: failure.status });
  }
}

export async function PATCH(request: Request, context: Context) {
  try {
    const { user, provider } = await authenticated(request);
    const { id } = await context.params;
    await requireTeamRole(id, user.id, ["owner", "admin", "analyst"]);
    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const recallId = text(body.recall_id);
    const state = text(body.state);
    if (!recallId || !recallStates.includes(state as (typeof recallStates)[number])) return NextResponse.json({ error: "A valid recall id and state are required." }, { status: 400 });
    if (provider === "cloudflare") {
      const workspace = await getWorkspaceState(id);
      const recall = workspace.recall_events.find((item) => String(item.id) === recallId);
      if (!recall) return NextResponse.json({ error: "Recall event not found." }, { status: 404 });
      if (!isRecallTransitionAllowed(recall.state, state as (typeof recallStates)[number])) return NextResponse.json({ error: "Recall events can only move forward from open to acknowledged to closed." }, { status: 409 });
      const now = nowIso();
      Object.assign(recall, { state, acknowledged_at: state === "acknowledged" || state === "closed" ? String(recall.acknowledged_at || now) : null, closed_at: state === "closed" ? now : null, updated_at: now });
      workspace.audit.unshift({ event_id: newId(), workspace_id: id, actor_id: user.id, action: `recall_${state}`, object_type: "recall_event", object_id: recallId, extension_id: recall.extension_id, version: recall.version, previous_state: null, resulting_state: { state }, rationale: null, risk_level: "critical", receipt_id: newId(), occurred_at: now });
      await saveState(id, workspace);
      return NextResponse.json(recall);
    }
    const db = serviceDb();
    const existing = await db.from("team_recall_events").select("*").eq("id", recallId).eq("team_id", id).maybeSingle();
    if (existing.error) throw existing.error;
    if (!existing.data) return NextResponse.json({ error: "Recall event not found." }, { status: 404 });
    if (!isRecallTransitionAllowed(existing.data.state, state as (typeof recallStates)[number])) return NextResponse.json({ error: "Recall events can only move forward from open to acknowledged to closed." }, { status: 409 });
    const now = nowIso();
    const result = await db.from("team_recall_events").update({ state, acknowledged_at: state === "acknowledged" || state === "closed" ? existing.data.acknowledged_at || now : null, closed_at: state === "closed" ? now : null }).eq("id", recallId).eq("team_id", id).select("*").maybeSingle();
    if (result.error) throw result.error;
    if (!result.data) return NextResponse.json({ error: "Recall event not found." }, { status: 404 });
    return NextResponse.json(result.data);
  } catch (error) {
    const failure = teamApiError(error, "The recall event could not be updated.");
    return NextResponse.json({ error: failure.error }, { status: failure.status });
  }
}

async function approve(teamId: string, userId: string, provider: string | undefined, body: Record<string, unknown>) {
  const scanId = text(body.scan_id);
  const rationale = text(body.rationale);
  if (!scanId) return NextResponse.json({ error: "A completed scan id is required." }, { status: 400 });
  if (rationale.length < 1 || rationale.length > 4000) return NextResponse.json({ error: "A rationale between 1 and 4,000 characters is required." }, { status: 400 });
  const scan = provider === "cloudflare" ? await cloudflareScan(scanId) : await supabaseScan(scanId);
  if (!scan) return NextResponse.json({ error: "The exact scan could not be found." }, { status: 404 });
  if (scan.analysis_status !== "complete" || scan.coverage_percent < 100) return NextResponse.json({ error: "Only a complete, 100% coverage scan can be approved." }, { status: 400 });
  let identity: ArtifactIdentity;
  try {
    identity = normalizeArtifactIdentity({ extension_id: scan.extension_id, version: scan.version, registry: body.registry, artifact_sha256: scan.artifact_sha256 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "The scan has invalid artifact identity." }, { status: 400 });
  }
  const capabilities = object(scan.capabilities);
  const delta = provider === "cloudflare"
    ? await approveCloudflare(teamId, userId, scanId, identity, capabilities, rationale)
    : await approveSupabase(teamId, userId, scanId, identity, capabilities, rationale);
  return NextResponse.json(delta.body, { status: delta.status });
}

async function recall(teamId: string, userId: string, provider: string | undefined, body: Record<string, unknown>) {
  const recordId = text(body.trust_record_id);
  const reason = text(body.reason);
  if (!recordId) return NextResponse.json({ error: "A trust record id is required." }, { status: 400 });
  if (reason.length < 1 || reason.length > 4000) return NextResponse.json({ error: "A reason between 1 and 4,000 characters is required." }, { status: 400 });
  return provider === "cloudflare"
    ? recallCloudflare(teamId, userId, recordId, reason)
    : recallSupabase(teamId, userId, recordId, reason);
}

async function approveCloudflare(teamId: string, userId: string, scanId: string, identity: ArtifactIdentity, capabilities: Record<string, unknown>, rationale: string) {
  const state = await getWorkspaceState(teamId);
  const existing = state.trust_records.find((record) => String(record.artifact_sha256 || "").toLowerCase() === identity.artifact_sha256);
  if (existing?.status === "approved") return { status: 200, body: { record: existing, idempotent: true } };
  const previous = state.trust_records.find((record) => String(record.extension_id || "").toLowerCase() === identity.extension_id.toLowerCase() && record.status === "approved");
  const delta = previous ? compareCapabilitySnapshots(previous.capability_snapshot, capabilities) : emptyDelta();
  const now = nowIso();
  const record: Record<string, unknown> = {
    ...(existing || { id: newId(), created_at: now }),
    team_id: teamId,
    extension_id: identity.extension_id,
    version: identity.version,
    registry: identity.registry,
    artifact_sha256: identity.artifact_sha256,
    scan_id: scanId,
    status: "approved",
    rationale,
    capability_snapshot: capabilities,
    capability_delta: delta,
    previous_record_id: previous?.id || null,
    created_by: existing?.created_by || userId,
    approved_by: userId,
    approved_at: now,
    revoked_by: null,
    revoked_at: null,
    updated_at: now,
  };
  state.trust_records = [record, ...state.trust_records.filter((item) => item !== existing)];
  state.audit.unshift({ event_id: newId(), workspace_id: teamId, actor_id: userId, action: existing ? "artifact_reapproved" : "artifact_approved", object_type: "artifact_trust_record", object_id: String(record.id), extension_id: identity.extension_id, version: identity.version, previous_state: existing || null, resulting_state: record, rationale, risk_level: delta.material ? "review" : "low", receipt_id: newId(), occurred_at: now });
  await saveState(teamId, state);
  return { status: existing ? 200 : 201, body: { record, idempotent: false } };
}

async function recallCloudflare(teamId: string, userId: string, recordId: string, reason: string) {
  const state = await getWorkspaceState(teamId);
  const record = state.trust_records.find((item) => String(item.id) === recordId);
  if (!record) return NextResponse.json({ error: "Trust record not found." }, { status: 404 });
  const existingRecall = state.recall_events.find((item) => String(item.trust_record_id) === recordId);
  if (existingRecall) return NextResponse.json({ record, recall: existingRecall, impact: existingRecall.affected_installations || emptyImpact(), idempotent: true }, { status: 200 });
  const identity = normalizeArtifactIdentity(record);
  const installations = state.inventory.installations.map((item) => ({ device_id: text(item.device_id), extension_id: text(item.extension_id), version: text(item.version), artifact_sha256: typeof item.artifact_sha256 === "string" ? item.artifact_sha256 : null } satisfies InventoryInstallation));
  const impact = recallImpact(installations, identity);
  const now = nowIso();
  Object.assign(record, { status: "revoked", revoked_by: userId, revoked_at: now, updated_at: now });
  const recallEvent = { id: newId(), team_id: teamId, trust_record_id: recordId, extension_id: identity.extension_id, version: identity.version, registry: identity.registry, artifact_sha256: identity.artifact_sha256, reason, state: "open", affected_installations: impact, created_by: userId, created_at: now };
  state.recall_events = [recallEvent, ...state.recall_events];
  state.alerts.unshift({ id: newId(), title: `Recalled artifact: ${identity.extension_id}@${identity.version}`, summary: `${impact.exact_matches} exact installation(s) and ${impact.version_only_matches} installation(s) without a reported hash require action.`, severity: "CRITICAL", state: "unread", kind: "artifact_recalled", extension_id: identity.extension_id, version: identity.version, metadata: { artifact_sha256: identity.artifact_sha256, recall_id: recallEvent.id } });
  state.audit.unshift({ event_id: newId(), workspace_id: teamId, actor_id: userId, action: "artifact_recalled", object_type: "artifact_trust_record", object_id: recordId, extension_id: identity.extension_id, version: identity.version, previous_state: { status: "approved" }, resulting_state: { status: "revoked", recall_id: recallEvent.id, impact }, rationale: reason, risk_level: "critical", receipt_id: newId(), occurred_at: now });
  await saveState(teamId, state);
  return NextResponse.json({ record, recall: recallEvent, impact }, { status: 201 });
}

async function approveSupabase(teamId: string, userId: string, scanId: string, identity: ArtifactIdentity, capabilities: Record<string, unknown>, rationale: string) {
  const db = serviceDb();
  const existingResult = await db.from("team_artifact_trust_records").select("*").eq("team_id", teamId).eq("artifact_sha256", identity.artifact_sha256).maybeSingle();
  if (existingResult.error) throw existingResult.error;
  if (existingResult.data?.status === "approved") return { status: 200, body: { record: existingResult.data, idempotent: true } };
  const previousResult = await db.from("team_artifact_trust_records").select("*").eq("team_id", teamId).eq("extension_id", identity.extension_id).eq("status", "approved").order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (previousResult.error) throw previousResult.error;
  const delta = previousResult.data ? compareCapabilitySnapshots(previousResult.data.capability_snapshot, capabilities) : emptyDelta();
  const values = { team_id: teamId, extension_id: identity.extension_id, version: identity.version, registry: identity.registry, artifact_sha256: identity.artifact_sha256, scan_id: scanId, status: "approved", rationale, capability_snapshot: capabilities, capability_delta: delta, created_by: existingResult.data?.created_by || userId, revoked_by: null, revoked_at: null };
  const write = existingResult.data
    ? db.from("team_artifact_trust_records").update(values).eq("id", existingResult.data.id).select("*").single()
    : db.from("team_artifact_trust_records").insert(values).select("*").single();
  const result = await write;
  if (result.error) throw result.error;
  return { status: existingResult.data ? 200 : 201, body: { record: result.data, idempotent: false } };
}

async function recallSupabase(teamId: string, userId: string, recordId: string, reason: string) {
  const db = serviceDb();
  const trust = await db.from("team_artifact_trust_records").select("*").eq("team_id", teamId).eq("id", recordId).maybeSingle();
  if (trust.error) throw trust.error;
  if (!trust.data) return NextResponse.json({ error: "Trust record not found." }, { status: 404 });
  const existingRecall = await db.from("team_recall_events").select("*").eq("team_id", teamId).eq("trust_record_id", recordId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (existingRecall.error) throw existingRecall.error;
  if (existingRecall.data) return NextResponse.json({ record: trust.data, recall: existingRecall.data, impact: existingRecall.data.affected_installations || emptyImpact(), idempotent: true }, { status: 200 });
  const identity = normalizeArtifactIdentity(trust.data);
  const inventory = await db.from("team_inventory_installations").select("device_id,extension_id,version,artifact_sha256").eq("team_id", teamId).eq("extension_id", identity.extension_id).eq("version", identity.version);
  if (inventory.error) throw inventory.error;
  const impact = recallImpact((inventory.data || []) as InventoryInstallation[], identity);
  const now = nowIso();
  const update = await db.from("team_artifact_trust_records").update({ status: "revoked", revoked_by: userId, revoked_at: now }).eq("id", recordId).eq("team_id", teamId).select("*").single();
  if (update.error) throw update.error;
  const inserted = await db.from("team_recall_events").insert({ team_id: teamId, trust_record_id: recordId, extension_id: identity.extension_id, version: identity.version, registry: identity.registry, artifact_sha256: identity.artifact_sha256, reason, state: "open", affected_installations: impact, created_by: userId }).select("*").single();
  if (inserted.error) throw inserted.error;
  await db.from("team_monitoring_alerts").upsert({ team_id: teamId, extension_id: identity.extension_id, version: identity.version, scan_id: trust.data.scan_id, kind: "artifact_recalled", severity: "CRITICAL", title: `Recalled artifact: ${identity.extension_id}@${identity.version}`, summary: `${impact.exact_matches} exact installation(s) and ${impact.version_only_matches} installation(s) without a reported hash require action.`, metadata: { artifact_sha256: identity.artifact_sha256, recall_id: inserted.data?.id }, dedupe_key: `recall:${identity.artifact_sha256}` }, { onConflict: "team_id,dedupe_key" });
  return NextResponse.json({ record: update.data, recall: inserted.data, impact }, { status: 201 });
}

async function cloudflareScan(scanId: string): Promise<ScanEvidence | null> {
  const row = await privateDb().prepare("SELECT extension_id,version FROM app_scan_reports WHERE scan_id=? LIMIT 1").bind(scanId).first<{ extension_id?: unknown; version?: unknown }>();
  if (!row?.extension_id || !row.version) return null;
  const product = await getCloudflareScanProduct(String(row.extension_id), String(row.version), scanId);
  const scan = product?.scan as Record<string, unknown> | undefined;
  if (!scan) return null;
  return { extension_id: String(row.extension_id), version: String(row.version), artifact_sha256: String(scan.artifact_sha256 || ""), analysis_status: String(scan.analysis_status || "incomplete"), coverage_percent: Number(scan.coverage_percent || 0), capabilities: object(scan.capabilities) };
}

async function supabaseScan(scanId: string): Promise<ScanEvidence | null> {
  const result = await serviceDb().from("scans").select("extension_id,version,artifact_sha256,analysis_status,coverage_percent,capabilities").eq("id", scanId).maybeSingle();
  if (result.error) throw result.error;
  if (!result.data) return null;
  return { extension_id: String(result.data.extension_id || ""), version: String(result.data.version || ""), artifact_sha256: String(result.data.artifact_sha256 || ""), analysis_status: String(result.data.analysis_status || "incomplete"), coverage_percent: Number(result.data.coverage_percent || 0), capabilities: object(result.data.capabilities) };
}

function emptyDelta(): CapabilityDelta {
  return { added: [], removed: [], changed: [], material: false };
}

function emptyImpact() {
  return { exact_matches: 0, version_only_matches: 0, affected_devices: [], installations: [] };
}

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}
