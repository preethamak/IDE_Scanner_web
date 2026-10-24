import { hashApiKey } from "@/lib/apiKeys";
import { AuthenticationError } from "@/lib/auth";
import { EntitlementError, workspaceEntitlements } from "@/lib/entitlements";
import { serviceDb } from "@/lib/supabase";
import { authenticateCloudflareApiKey, type ApiKeyScope } from "@/lib/cloudflareApiKeys";

export type ApiKeyAuth = { teamId: string; keyId: string; provider: "cloudflare" | "supabase"; scopes: ApiKeyScope[] };

/**
 * Authenticates a request against a workspace `api_keys` row (distinct from
 * `authenticated()` in lib/auth.ts, which only accepts Supabase session
 * JWTs). Bulk, machine-to-machine endpoints use this instead.
 */
export async function authenticatedByApiKey(request: Request, requiredScope?: ApiKeyScope): Promise<ApiKeyAuth> {
  const raw = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() || "";
  if (!raw) throw new AuthenticationError("Provide an API key as: Authorization: Bearer <key>.");
  let cloudflare = null;
  try {
    cloudflare = await authenticateCloudflareApiKey(raw);
  } catch {
    // D1 is unavailable in local and legacy Supabase deployments. Continue to
    // the compatibility key store rather than turning an availability detail
    // into an authentication verdict.
  }
  if (cloudflare) {
    if (requiredScope && !cloudflare.scopes.includes(requiredScope)) throw new AuthenticationError("This API key does not have the required scope.");
    return { ...cloudflare, provider: "cloudflare" };
  }
  const db = serviceDb();
  const { data, error } = await db
    .from("api_keys")
    .select("id,team_id,revoked_at")
    .eq("key_hash", hashApiKey(raw))
    .maybeSingle();
  if (error) throw error;
  if (!data || data.revoked_at) throw new AuthenticationError("This API key is invalid or has been revoked.");

  const entitlements = await workspaceEntitlements(data.team_id);
  if (entitlements.plan === "free") {
    throw new EntitlementError("ENTITLEMENT_REQUIRED", "Bulk API access requires the Team plan or higher.");
  }

  void db.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", data.id).then(
    () => {},
    () => {},
  );

  return { teamId: data.team_id, keyId: data.id, provider: "supabase", scopes: ["gate:read", "collector:write"] };
}
