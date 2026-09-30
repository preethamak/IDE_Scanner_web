import type { SupabaseClient } from "@supabase/supabase-js";

type BrowserDatabase = SupabaseClient | null | undefined;

export async function browserAuthHeaders(db: BrowserDatabase): Promise<Record<string, string>> {
  try {
    const response = await fetch("/api/auth/session", { cache: "no-store" });
    const body = await response.json().catch(() => ({}));
    if (response.ok && body.user) {
      // D1 sessions are identified by the HttpOnly gr_session cookie. Legacy
      // Supabase sessions are also exposed by /api/auth/session, but their
      // credential may live in an SSR cookie that is not readable here.
      if (String(body.user.provider || "").toLowerCase() === "supabase") {
        try {
          const accessToken = (await db?.auth.getSession())?.data.session?.access_token;
          if (accessToken) return { Authorization: `Bearer ${accessToken}` };
        } catch {
          // Use the server-side cookie marker below.
        }
        return { Authorization: "Bearer supabase-session" };
      }
      return { Authorization: "Bearer cloudflare-session" };
    }
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
