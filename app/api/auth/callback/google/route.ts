import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import {
  createSession,
  parseCookies,
  requestIsSecure,
  safeNext,
  sessionCookie,
  upsertGoogleUser,
} from "@/lib/cloudflarePrivate";
import { googleCookieFlags, googleRedirectUri } from "@/lib/googleOAuth";
import { runtimeEnv } from "@/lib/runtimeEnv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type GoogleProfile = {
  sub?: unknown;
  email?: unknown;
  email_verified?: unknown;
  name?: unknown;
  given_name?: unknown;
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const cookies = parseCookies(request.headers.get("cookie") || "");
  const state = url.searchParams.get("state") || "";
  const expectedState = cookies.gr_google_state || "";
  const next = safeNext(cookies.gr_google_next);
  if (!state || !expectedState || !timingSafe(state, expectedState)) return redirectError(url, "invalid_state");
  const code = url.searchParams.get("code") || "";
  const verifier = cookies.gr_google_verifier || "";
  if (!code || !verifier) return redirectError(url, "missing_code");
  const clientId = runtimeEnv("GOOGLE_OAUTH_CLIENT_ID");
  if (!clientId) return redirectError(url, "provider_unavailable");

  try {
    const tokenBody = new URLSearchParams({
      client_id: clientId,
      code,
      code_verifier: verifier,
      grant_type: "authorization_code",
      redirect_uri: googleRedirectUri(url),
    });
    const clientSecret = runtimeEnv("GOOGLE_OAUTH_CLIENT_SECRET").trim();
    if (clientSecret) tokenBody.set("client_secret", clientSecret);
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: tokenBody,
    });
    const tokens = await tokenResponse.json() as {
      access_token?: unknown;
      error?: unknown;
      error_description?: unknown;
    };
    const accessToken = typeof tokens.access_token === "string" ? tokens.access_token : "";
    if (!tokenResponse.ok || !accessToken) {
      console.error("[google-oauth] token exchange failed", tokens.error, tokens.error_description);
      return redirectError(
        url,
        tokens.error === "access_denied" ? "google_denied" : "provider_denied",
      );
    }
    const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!profileResponse.ok) {
      console.error("[google-oauth] userinfo request failed", profileResponse.status);
      return redirectError(url, "provider_denied");
    }
    const profile = await profileResponse.json() as GoogleProfile;
    const subject = String(profile.sub || "").trim();
    const email = typeof profile.email === "string" ? profile.email.trim().toLowerCase() : "";
    if (!subject || !email || profile.email_verified !== true) return redirectError(url, "missing_email");
    const displayName = String(profile.name || profile.given_name || email.split("@")[0]).trim().slice(0, 120);
    const user = await upsertGoogleUser({ subject, email, displayName });
    const session = await createSession(user.id);
    const response = NextResponse.redirect(new URL(next, url.origin));
    const secure = requestIsSecure(request);
    response.headers.append("Set-Cookie", sessionCookie(session, undefined, secure));
    response.headers.append("Set-Cookie", clearCookie("gr_google_state", secure));
    response.headers.append("Set-Cookie", clearCookie("gr_google_verifier", secure));
    response.headers.append("Set-Cookie", clearCookie("gr_google_next", secure));
    return response;
  } catch {
    return redirectError(url, "provider_unavailable");
  }
}

function timingSafe(left: string, right: string): boolean {
  return createHash("sha256").update(left).digest("hex") === createHash("sha256").update(right).digest("hex");
}

function clearCookie(name: string, secure: boolean): string {
  return `${name}=; Max-Age=0; ${googleCookieFlags(secure)}`;
}

function redirectError(url: URL, code: string): NextResponse {
  const destination = new URL("/account", url.origin);
  destination.searchParams.set("error", code);
  return NextResponse.redirect(destination);
}
