import "server-only";

import { authenticated } from "@/lib/auth";
import { cloudflarePrivateAvailable, getCloudflareAuthorizedVersionProduct } from "@/lib/cloudflareDeepScan";
import { parseCookies } from "@/lib/cloudflarePrivate";
import { getVersionProduct, getVersionScanProduct } from "@/lib/productData";
import { serverDb } from "@/lib/supabaseServer";
import { runtimeSupabase } from "@/lib/supabaseRuntime";

/** Use the immutable report's access rules for export and comparison too. */
export async function requestScanEvidence(request: Request) {
  const cloudflare = cloudflarePrivateAvailable();
  const session = await authenticated(request).catch(() => null);
  const client = session?.db || (cloudflare ? runtimeSupabase() : await serverDb().catch(() => null));
  const userId = session?.provider === "cloudflare" ? session.user.id : undefined;
  let guestTrialToken = "";
  try { guestTrialToken = parseCookies(request.headers.get("cookie") || "").gr_trial || ""; } catch { /* Invalid cookies grant no access. */ }
  return async (id: string, version: string, scanId?: string) => {
    const options = { skipCloudflareCatalog: true, authorizedUserId: userId, guestTrialToken };
    if (scanId) return getVersionScanProduct(id, version, scanId, client || undefined, options);
    if (cloudflare && (userId || guestTrialToken)) {
      const owned = await getCloudflareAuthorizedVersionProduct(id, version, userId, guestTrialToken);
      if (owned) return owned;
    }
    const summary = await getVersionProduct(id, version, client || undefined);
    const scan = summary?.scan as Record<string, unknown> | null | undefined;
    // A version summary deliberately omits findings/files. Consumers here
    // require full normalized evidence from its authorized immutable scan.
    return scan?.id
      ? getVersionScanProduct(id, version, String(scan.id), client || undefined, options)
      : summary;
  };
}
