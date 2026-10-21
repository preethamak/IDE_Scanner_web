import { hashApiKey } from "@/lib/apiKeys";
import { hasApiKeyScopes, type ApiKeyScope } from "@/lib/apiKeyScopes";
import { apiKeyUsageRecord } from "@/lib/apiKeyUsage";
import { AuthenticationError } from "@/lib/auth";
import { EntitlementError, workspaceEntitlements } from "@/lib/entitlements";
import { serviceDb } from "@/lib/supabase";

export type ApiKeyAuth = { teamId: string; keyId: string; scopes: ApiKeyScope[] };

/**
 * Authenticates a request against a workspace `api_keys` row (distinct from
 * `authenticated()` in lib/auth.ts, which only accepts Supabase session
 * JWTs). Bulk, machine-to-machine endpoints use this instead.
 */
export async function authenticatedByApiKey(
  request: Request,
  options: { requiredScopes?: readonly ApiKeyScope[] } = {},
): Promise<ApiKeyAuth> {
  const raw = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() || "";
  if (!raw) throw new AuthenticationError("Provide an API key as: Authorization: Bearer <key>.");
  const db = serviceDb();
  const { data, error } = await db
    .from("api_keys")
    .select("id,team_id,revoked_at,scopes")
    .eq("key_hash", hashApiKey(raw))
    .maybeSingle();
  if (error) throw error;
  if (!data || data.revoked_at) throw new AuthenticationError("This API key is invalid or has been revoked.");
  if (!hasApiKeyScopes(data.scopes, options.requiredScopes || [])) {
    throw new AuthenticationError("This API key does not have the scope required for this operation.");
  }

  const entitlements = await workspaceEntitlements(data.team_id);
  if (entitlements.plan === "free") {
    throw new EntitlementError("ENTITLEMENT_REQUIRED", "Bulk API access requires the Team plan or higher.");
  }

  // Authentication remains available if audit storage has a transient issue.
  // The audit record never includes the raw bearer secret or request payload.
  void Promise.allSettled([
    db.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", data.id),
    db.from("api_key_usage").insert(apiKeyUsageRecord({ teamId: data.team_id, keyId: data.id, request })),
  ]);

  return { teamId: data.team_id, keyId: data.id, scopes: data.scopes as ApiKeyScope[] };
}
