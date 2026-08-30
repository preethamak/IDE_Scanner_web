import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { serverDb } from "@/lib/supabaseServer";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const otpType = url.searchParams.get("type") as EmailOtpType | null;
  const requested = url.searchParams.get("next") || "/workspace";
  let next = new URL("/workspace", url.origin);
  if (requested.startsWith("/") && !requested.includes("\\")) {
    const resolved = new URL(requested, url.origin);
    if (resolved.origin === url.origin) next = resolved;
  }
  const db = await serverDb();
  if (code) {
    const { error } = await db.auth.exchangeCodeForSession(code);
    if (error) return NextResponse.redirect(new URL("/account?error=invalid_link", url.origin));
    return NextResponse.redirect(next);
  }
  // Supabase's default email templates deliver token_hash + type instead of a PKCE code.
  if (tokenHash && otpType) {
    const { error } = await db.auth.verifyOtp({ type: otpType, token_hash: tokenHash });
    if (error) return NextResponse.redirect(new URL("/account?error=invalid_link", url.origin));
    return NextResponse.redirect(next);
  }
  return NextResponse.redirect(new URL("/account?error=missing_code", url.origin));
}
