import "server-only";

import { cookies } from "next/headers";
import { parseCookies, userFromSession, type AppAuthUser } from "@/lib/cloudflarePrivate";
import { serverDb } from "@/lib/supabaseServer";

async function cookieHeader(): Promise<string> {
  return (await cookies())
    .getAll()
    .map(({ name, value }) => `${name}=${value}`)
    .join("; ");
}

export async function cloudflareSessionUser(): Promise<AppAuthUser | null> {
  try {
    const header = await cookieHeader();
    return await userFromSession(new Request("https://abscissa.dev", { headers: { cookie: header } }));
  } catch {
    return null;
  }
}

export async function cloudflareGuestTrialToken(): Promise<string> {
  try {
    return parseCookies(await cookieHeader()).gr_trial || "";
  } catch {
    return "";
  }
}

export async function cloudflareSessionActive(): Promise<boolean> {
  try {
    if (await cloudflareSessionUser()) return true;
    const db = await serverDb();
    const result = await db.auth.getUser();
    return Boolean(!result.error && result.data.user);
  } catch {
    return false;
  }
}
