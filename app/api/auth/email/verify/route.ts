import { NextResponse } from "next/server";
import {
  createSession,
  nowIso,
  privateDb,
  requestIsSecure,
  safeNext,
  sessionCookie,
  upsertEmailUser,
} from "@/lib/cloudflarePrivate";
import { codeHash } from "@/app/api/auth/email/request/route";
import { runtimeSupabase } from "@/lib/supabaseRuntime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") || "";
  const email = String(url.searchParams.get("email") || "").trim().toLowerCase();
  const next = safeNext(url.searchParams.get("next"));
  if (!token || !email) return redirectError(url);
  try {
    const db = privateDb();
    const rows = await db
      .prepare("SELECT email,code_hash,expires_at FROM app_email_auth_codes WHERE email=? LIMIT 1")
      .bind(email)
      .all<{ email?: unknown; code_hash?: unknown; expires_at?: unknown }>();
    const row = rows.results[0];
    if (String(row?.email || "").trim().toLowerCase() !== email || String(row?.code_hash || "") !== codeHash(email, token) || Date.parse(String(row?.expires_at || "")) <= Date.now()) {
      return redirectError(url);
    }
    await db.prepare("DELETE FROM app_email_auth_codes WHERE email=?").bind(email).run();
    const user = await upsertEmailUser(email);
    const session = await createSession(user.id);
    const response = NextResponse.redirect(new URL(next, url.origin));
    response.headers.append("Set-Cookie", sessionCookie(session, undefined, requestIsSecure(request)));
    return response;
  } catch {
    return redirectError(url);
  }
}

export async function POST(request: Request) {
  let email = "";
  let code = "";
  let next = "/workspace";
  try {
    const body = await request.json() as { email?: unknown; code?: unknown; next?: unknown };
    email = String(body.email || "").trim().toLowerCase();
    code = String(body.code || "").trim();
    next = safeNext(String(body.next || "/workspace"));
  } catch {
    return NextResponse.json({ error: "Enter the complete sign-in code." }, { status: 400 });
  }
  if (!email || !/^\d{6,10}$/.test(code)) return NextResponse.json({ error: "Enter the complete sign-in code." }, { status: 400 });
  try {
    const db = privateDb();
    const row = await db.prepare("SELECT code_hash,attempts,expires_at FROM app_email_auth_codes WHERE email=?").bind(email).first<{ code_hash?: unknown; attempts?: unknown; expires_at?: unknown }>();
    if (row) {
      if (Date.parse(String(row.expires_at || "")) <= Date.now() || Number(row.attempts || 0) >= 5) {
        return NextResponse.json({ error: "That code is invalid or expired. Request a new one." }, { status: 400 });
      }
      await db.prepare("UPDATE app_email_auth_codes SET attempts=attempts+1 WHERE email=?").bind(email).run();
      if (String(row.code_hash) !== codeHash(email, code)) return NextResponse.json({ error: "That code is invalid or expired. Request a new one." }, { status: 400 });
      await db.prepare("DELETE FROM app_email_auth_codes WHERE email=?").bind(email).run();
      return createD1Session(email, next, request);
    }
  } catch {
    // Fall through to Supabase Auth when Cloudflare's email path is unavailable.
  }
  const supabase = runtimeSupabase();
  if (!supabase) return NextResponse.json({ error: "That code is invalid or expired. Request a new one." }, { status: 400 });
  const result = await supabase.auth.verifyOtp({ email, token: code, type: "email" });
  if (result.error || !result.data.user?.email) return NextResponse.json({ error: "That code is invalid or expired. Request a new one." }, { status: 400 });
  return createD1Session(result.data.user.email, next, request);
}

async function createD1Session(email: string, next: string, request: Request): Promise<NextResponse> {
  const user = await upsertEmailUser(email);
  const session = await createSession(user.id);
  const response = NextResponse.json({ ok: true, next, signed_in_at: nowIso() });
  response.headers.append("Set-Cookie", sessionCookie(session, undefined, requestIsSecure(request)));
  return response;
}

function redirectError(url: URL): NextResponse {
  return NextResponse.redirect(new URL("/account?error=invalid_link", url.origin));
}
