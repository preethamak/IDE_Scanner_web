import { userDb } from "@/lib/supabase";

export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthenticationError";
  }
}

export async function authenticated(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  if (!token) throw new AuthenticationError("Authentication required.");
  const db = userDb(token);
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) throw new AuthenticationError("Authentication session is invalid.");
  return { db, user: data.user };
}
