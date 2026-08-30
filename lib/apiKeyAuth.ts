import { hashApiKey } from "@/lib/apiKeys";
import { AuthenticationError } from "@/lib/auth";
import { EntitlementError, workspaceEntitlements } from "@/lib/entitlements";
import { serviceDb } from "@/lib/supabase";

export type ApiKeyAuth = { teamId: string; keyId: string };

/**
 * Authenticates a request against a workspace `api_keys` row (distinct from
 * `authenticated()` in lib/auth.ts, which only accepts Supabase session
 * JWTs). Bulk, machine-to-machine endpoints use this instead.
 */
export async function authenticatedByApiKey(request: Request): Promise<ApiKeyAuth> {
  const raw = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() || "";
  if (!raw) throw new AuthenticationError("Provide an API key as: Authorization: Bearer <key>.");
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

  return { teamId: data.team_id, keyId: data.id };
}
