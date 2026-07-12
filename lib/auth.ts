import { userDb } from "@/lib/supabase";

export async function authenticated(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  if (!token) throw new Error("Authentication required.");
  const db = userDb(token);
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) throw new Error("Authentication session is invalid.");
  return { db, user: data.user };
}
