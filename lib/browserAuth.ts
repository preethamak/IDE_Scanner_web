import type { SupabaseClient } from "@supabase/supabase-js";

type BrowserDatabase = SupabaseClient | null | undefined;

export async function browserAuthHeaders(db: BrowserDatabase): Promise<Record<string, string>> {
  try {
    const response = await fetch("/api/auth/session", { cache: "no-store" });
    const body = await response.json().catch(() => ({}));
    if (response.ok && body.user) return { Authorization: "Bearer cloudflare-session" };
  } catch {
    // Supabase remains the compatibility path when the D1 session endpoint is unavailable.
  }
  try {
    const accessToken = (await db?.auth.getSession())?.data.session?.access_token;
    return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
  } catch {
    return {};
  }
}
