import "server-only";

import { privateDb, jsonValue, newId, nowIso, saveWorkspaceState, workspaceState, type AppAuthUser } from "@/lib/cloudflarePrivate";
import { getCloudflareRegistryProduct } from "@/lib/cloudflareRegistry";

export type CloudflareWorkspaceState = {
  watchlist: Array<Record<string, unknown>>;
  alerts: Array<Record<string, unknown>>;
  decisions: Array<Record<string, unknown>>;
  members: Array<Record<string, unknown>>;
  channels: Array<Record<string, unknown>>;
  deliveries: Array<Record<string, unknown>>;
  digest_deliveries: Array<Record<string, unknown>>;
  preferences: Record<string, unknown>;
  audit: Array<Record<string, unknown>>;
  invitations: Array<Record<string, unknown>>;
  inventory: {
    devices: Array<Record<string, unknown>>;
    installations: Array<Record<string, unknown>>;
    last_import_at: string | null;
  };
};

export const defaultWorkspaceState: CloudflareWorkspaceState = {
  watchlist: [], alerts: [], decisions: [], members: [], channels: [], deliveries: [], digest_deliveries: [], audit: [], invitations: [], inventory: { devices: [], installations: [], last_import_at: null },
  preferences: { release_alerts: true, scan_alerts: true, decision_alerts: true, high_evidence_alerts: true, provenance_alerts: true, coverage_alerts: true, due_alerts: true, weekly_digest: false, digest_weekday: 1, digest_hour_utc: 9 },
};

export async function getWorkspaceState(teamId: string): Promise<CloudflareWorkspaceState> {
  const raw = await workspaceState(teamId);
  return {
    ...defaultWorkspaceState,
    ...raw,
    watchlist: array(raw.watchlist), alerts: array(raw.alerts), decisions: array(raw.decisions), members: array(raw.members), channels: array(raw.channels), deliveries: array(raw.deliveries), digest_deliveries: array(raw.digest_deliveries), audit: array(raw.audit), invitations: array(raw.invitations), inventory: inventory(raw.inventory), preferences: { ...defaultWorkspaceState.preferences, ...jsonValue(raw.preferences) },
  };
}
export async function saveState(teamId: string, state: CloudflareWorkspaceState): Promise<void> {
  await saveWorkspaceState(teamId, state as unknown as Record<string, unknown>);
}

export async function ensureOwnerMember(teamId: string, user: AppAuthUser, state: CloudflareWorkspaceState): Promise<CloudflareWorkspaceState> {
  if (!state.members.some((member) => String(member.user_id) === user.id)) {
    state.members.unshift({ user_id: user.id, role: "owner", profiles: { display_name: user.display_name || user.email } });
    await saveState(teamId, state);
  }
  return state;
}

export async function audit(teamId: string, state: CloudflareWorkspaceState, userId: string, action: string, objectType: string, objectId: string, details: Record<string, unknown> = {}): Promise<void> {
  state.audit.unshift({ event_id: newId(), workspace_id: teamId, actor_id: userId, action, object_type: objectType, object_id: objectId, previous_state: null, resulting_state: details, rationale: null, risk_level: null, receipt_id: newId(), occurred_at: nowIso() });
  state.audit = state.audit.slice(0, 500);
  await saveState(teamId, state);
}

export async function extensionForWatchlist(extensionId: string): Promise<Record<string, unknown> | null> {
  const product = await getCloudflareRegistryProduct<{ extension?: Record<string, unknown> }>(extensionId);
  return product?.extension || null;
}

export async function enqueueWebhookDelivery(teamId: string, payload: Record<string, unknown>, kind: string, target: string): Promise<void> {
  const now = nowIso();
  await privateDb().prepare("INSERT INTO app_notification_deliveries(id,team_id,kind,target,payload_json,status,attempts,next_attempt_at,created_at) VALUES(?,?,?,?,?,?,?,?,?)").bind(newId(), teamId, kind, target, JSON.stringify(payload), "pending", 0, now, now).run();
}

function array(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object" && !Array.isArray(item))) : [];
}

function inventory(value: unknown): CloudflareWorkspaceState["inventory"] {
  const raw = jsonValue(value);
  return { devices: array(raw.devices), installations: array(raw.installations), last_import_at: typeof raw.last_import_at === "string" ? raw.last_import_at : null };
}
