import { userDb } from "@/lib/supabase";
import { userFromSession } from "@/lib/cloudflarePrivate";

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
  if (!token) throw new AuthenticationError("Authentication required.");
  const db = userDb(token);
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) throw new AuthenticationError("Authentication session is invalid.");
  return { db, user: data.user, provider: "supabase" as const };
}
