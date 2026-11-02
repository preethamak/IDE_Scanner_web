import "server-only";

import { hashApiKey } from "@/lib/apiKeys";
import { newId, nowIso, privateDb } from "@/lib/cloudflarePrivate";

export const API_KEY_SCOPES = ["gate:read", "collector:write"] as const;
export type ApiKeyScope = (typeof API_KEY_SCOPES)[number];
export type CloudflareApiKey = { id: string; team_id: string; label: string; key_prefix: string; scopes: ApiKeyScope[]; last_used_at: string | null; revoked_at: string | null; created_at: string };

export async function listCloudflareApiKeys(teamId: string): Promise<CloudflareApiKey[]> {
  const rows = await privateDb().prepare("SELECT id,team_id,label,key_prefix,scopes_json,last_used_at,revoked_at,created_at FROM app_workspace_api_keys WHERE team_id=? ORDER BY created_at DESC").bind(teamId).all<Record<string, unknown>>();
  return rows.results.map(toApiKey);
}

export async function countActiveCloudflareApiKeys(teamId: string): Promise<number> {
  const row = await privateDb().prepare("SELECT COUNT(*) AS count FROM app_workspace_api_keys WHERE team_id=? AND revoked_at IS NULL").bind(teamId).first<{ count?: unknown }>();
  return Number(row?.count || 0);
}

export async function createCloudflareApiKey(input: { teamId: string; label: string; keyPrefix: string; keyHash: string; scopes: readonly ApiKeyScope[]; createdBy: string }): Promise<CloudflareApiKey> {
  const id = newId();
  const createdAt = nowIso();
  await privateDb().prepare("INSERT INTO app_workspace_api_keys(id,team_id,label,key_prefix,key_hash,scopes_json,created_by,created_at) VALUES(?,?,?,?,?,?,?,?)").bind(id, input.teamId, input.label, input.keyPrefix, input.keyHash, JSON.stringify([...input.scopes]), input.createdBy, createdAt).run();
  return { id, team_id: input.teamId, label: input.label, key_prefix: input.keyPrefix, scopes: [...input.scopes], last_used_at: null, revoked_at: null, created_at: createdAt };
}

export async function revokeCloudflareApiKey(teamId: string, keyId: string): Promise<boolean> {
  const result = await privateDb().prepare("UPDATE app_workspace_api_keys SET revoked_at=? WHERE id=? AND team_id=? AND revoked_at IS NULL").bind(nowIso(), keyId, teamId).run();
  return Number(result.meta?.changes || 0) === 1;
}

export async function authenticateCloudflareApiKey(raw: string): Promise<{ teamId: string; keyId: string; scopes: ApiKeyScope[] } | null> {
  const row = await privateDb().prepare("SELECT id,team_id,scopes_json FROM app_workspace_api_keys WHERE key_hash=? AND revoked_at IS NULL LIMIT 1").bind(hashApiKey(raw)).first<Record<string, unknown>>();
  if (!row) return null;
  const scopes = parseScopes(row.scopes_json);
  const id = String(row.id || "");
  if (!id || !String(row.team_id || "")) return null;
  await privateDb().prepare("UPDATE app_workspace_api_keys SET last_used_at=? WHERE id=?").bind(nowIso(), id).run();
  return { teamId: String(row.team_id), keyId: id, scopes };
}

export function parseScopes(value: unknown): ApiKeyScope[] {
  if (!value) return [...API_KEY_SCOPES];
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    const scopes = Array.isArray(parsed) ? parsed.filter((scope): scope is ApiKeyScope => typeof scope === "string" && API_KEY_SCOPES.includes(scope as ApiKeyScope)) : [];
    return scopes.length ? [...new Set(scopes)] : [...API_KEY_SCOPES];
  } catch { return [...API_KEY_SCOPES]; }
}

function toApiKey(row: Record<string, unknown>): CloudflareApiKey {
  return { id: String(row.id), team_id: String(row.team_id), label: String(row.label), key_prefix: String(row.key_prefix), scopes: parseScopes(row.scopes_json), last_used_at: row.last_used_at ? String(row.last_used_at) : null, revoked_at: row.revoked_at ? String(row.revoked_at) : null, created_at: String(row.created_at) };
}
