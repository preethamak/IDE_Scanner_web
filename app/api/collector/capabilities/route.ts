import { NextResponse } from "next/server";
import { authenticatedByApiKey } from "@/lib/apiKeyAuth";
import { AuthenticationError } from "@/lib/auth";
import { getWorkspaceState, saveState } from "@/lib/cloudflareWorkspace";
import { newId, nowIso } from "@/lib/cloudflarePrivate";
import { applyCollectorSnapshot, collectorIdempotencyKey, collectorSnapshotFingerprint, COLLECTOR_SNAPSHOT_SCHEMA, CollectorValidationError, parseCollectorSnapshot } from "@/lib/capabilityCollector";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store", "X-GuardRails-Collector-Schema": COLLECTOR_SNAPSHOT_SCHEMA };
export async function GET(request: Request) { try { const auth = await authenticatedByApiKey(request, "collector:write"); return NextResponse.json({ schemas: [COLLECTOR_SNAPSHOT_SCHEMA], idempotency_header: "Idempotency-Key", workspace_id: auth.teamId }, { headers }); } catch { return NextResponse.json({ error: "Collector authentication is required." }, { status: 401 }); } }

/** Machine ingestion endpoint. The API key decides the workspace; callers cannot select a different team. */
export async function POST(request: Request) {
  try {
    const auth = await authenticatedByApiKey(request, "collector:write");
    if (auth.provider !== "cloudflare") return NextResponse.json({ error: "Collector ingestion is being rolled out to this workspace provider." }, { status: 503 });
    const snapshot = parseCollectorSnapshot(await request.json().catch(() => null), auth.teamId);
    const state = await getWorkspaceState(auth.teamId);
    const key = collectorIdempotencyKey(request.headers.get("idempotency-key"));
    const fingerprint = collectorSnapshotFingerprint(snapshot);
    const prior = key ? (state.collector_receipts || []).find((item) => String(item.key) === key) : null;
    if (prior) {
      if (String(prior.snapshot_sha256) !== fingerprint) return NextResponse.json({ error: "Idempotency-Key was already used for a different collector snapshot." }, { status: 409, headers });
      return NextResponse.json({ accepted: true, duplicate: true, workspace_id: auth.teamId, device_id: prior.device_id, reported_at: prior.reported_at, receipt_id: prior.receipt_id }, { status: 202, headers });
    }
    const applied = applyCollectorSnapshot({ workspaceId: auth.teamId, existingGraph: state.capability_graph, inventory: state.inventory, snapshot });
    state.inventory = applied.inventory;
    state.capability_graph = applied.graph;
    const occurredAt = nowIso();
    const receiptId = newId();
    state.audit.unshift({ event_id: newId(), workspace_id: auth.teamId, actor_id: `api_key:${auth.keyId}`, action: "collector_snapshot_ingested", object_type: "capability_collector", object_id: snapshot.inventory.device.id, previous_state: null, resulting_state: { extensions: snapshot.inventory.extensions.length, capability_subjects: snapshot.graph.subjects.length, source: "api", snapshot_sha256: fingerprint }, rationale: null, risk_level: null, receipt_id: receiptId, occurred_at: occurredAt });
    state.audit = state.audit.slice(0, 500);
    if (key) state.collector_receipts = [{ key, snapshot_sha256: fingerprint, receipt_id: receiptId, device_id: snapshot.inventory.device.id, reported_at: snapshot.inventory.reported_at, accepted_at: occurredAt }, ...(state.collector_receipts || [])].slice(0, 200);
    await saveState(auth.teamId, state);
    return NextResponse.json({ accepted: true, duplicate: false, receipt_id: receiptId, workspace_id: auth.teamId, device_id: snapshot.inventory.device.id, reported_at: snapshot.inventory.reported_at, inventory: { extensions: snapshot.inventory.extensions.length }, capability_graph: { subjects: applied.graph.subjects.length, relationships: applied.graph.relationships.length } }, { status: 202, headers });
  } catch (error) {
    if (error instanceof AuthenticationError) return NextResponse.json({ error: error.message }, { status: 401 });
    if (error instanceof CollectorValidationError) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ error: "Collector ingestion is temporarily unavailable." }, { status: 503 });
  }
}
