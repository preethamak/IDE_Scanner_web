import "server-only";

import { cookies } from "next/headers";
import { userFromSession } from "@/lib/cloudflarePrivate";
import { serverDb } from "@/lib/supabaseServer";

export async function cloudflareSessionActive(): Promise<boolean> {
  try {
    const cookieHeader = (await cookies())
      .getAll()
      .map(({ name, value }) => `${name}=${value}`)
      .join("; ");
    if (await userFromSession(new Request("https://abscissa.dev", { headers: { cookie: cookieHeader } }))) return true;
    const db = await serverDb();
    const result = await db.auth.getUser();
    return Boolean(!result.error && result.data.user);
  } catch {
    return false;
  }
}
