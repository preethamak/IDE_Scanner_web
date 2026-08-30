import { NextResponse } from "next/server";
import { serverDb } from "@/lib/supabaseServer";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const requested = url.searchParams.get("next") || "/workspace";
  let next = new URL("/workspace", url.origin);
  if (requested.startsWith("/") && !requested.includes("\\")) {
    const resolved = new URL(requested, url.origin);
    if (resolved.origin === url.origin) next = resolved;
  }
  if (!code) return NextResponse.redirect(new URL("/account?error=missing_code", url.origin));
  const db = await serverDb();
  const { error } = await db.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(new URL("/account?error=invalid_link", url.origin));
  return NextResponse.redirect(next);
}
