import { NextResponse } from "next/server";
import { clearSessionCookie, deleteSession } from "@/lib/cloudflarePrivate";
import { serverDb } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try { await deleteSession(request); } catch { /* Expired sessions are already logged out. */ }
  try { await (await serverDb()).auth.signOut(); } catch { /* The compatibility session may not exist. */ }
  const response = NextResponse.json({ ok: true });
  response.headers.set("Set-Cookie", clearSessionCookie());
  return response;
}
