import { userDb } from "@/lib/supabase";
import { userFromSession } from "@/lib/cloudflarePrivate";
import { serverDb } from "@/lib/supabaseServer";

export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthenticationError";
  }
}

export async function authenticated(request: Request) {
  try {
    const privateUser = await userFromSession(request);
    if (privateUser) return { db: null, user: privateUser, provider: "cloudflare" as const };
  } catch {
    // The D1 path is unavailable in local development; retain Supabase as a
    // compatibility path until the app is running on Cloudflare.
  }
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  // Browser requests from the legacy Supabase session path use a marker when
  // the access token is kept in an HttpOnly SSR cookie. Resolve that cookie on
  // the server instead of treating an already signed-in user as anonymous.
  if (!token || ["cloudflare-session", "supabase-session"].includes(token)) {
    try {
      const db = await serverDb();
      const { data, error } = await db.auth.getUser();
      if (!error && data.user) {
        return { db, user: data.user, provider: "supabase" as const };
      }
    } catch {
      // Continue to the explicit error below so callers receive a stable auth
      // response when the compatibility provider is not configured.
    }
    if (!token) throw new AuthenticationError("Authentication required.");
    throw new AuthenticationError("Authentication session is invalid.");
  }
  const db = userDb(token);
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) throw new AuthenticationError("Authentication session is invalid.");
  return { db, user: data.user, provider: "supabase" as const };
}
