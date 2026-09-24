import { NextResponse } from "next/server";
import { createHash, randomBytes } from "node:crypto";
import { runtimeEnv } from "@/lib/runtimeEnv";
import { requestIsSecure, safeNext } from "@/lib/cloudflarePrivate";
import { googleCookieFlags, googleRedirectUri } from "@/lib/googleOAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const clientId = runtimeEnv("GOOGLE_OAUTH_CLIENT_ID");
  if (!clientId) return NextResponse.json({ error: "Google sign-in is not configured." }, { status: 503 });
  const url = new URL(request.url);
  const state = randomBytes(24).toString("base64url");
  const verifier = randomBytes(48).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || url.protocol.replace(":", "");
  const host = request.headers.get("host") || url.host;
  const requestOrigin = `${forwardedProto}://${host}`;
  const callback = googleRedirectUri(url, requestOrigin);
  const authorize = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authorize.searchParams.set("client_id", clientId);
  authorize.searchParams.set("redirect_uri", callback);
  authorize.searchParams.set("response_type", "code");
  authorize.searchParams.set("scope", "openid email profile");
  authorize.searchParams.set("state", state);
  authorize.searchParams.set("code_challenge", challenge);
  authorize.searchParams.set("code_challenge_method", "S256");
  authorize.searchParams.set("prompt", "select_account");
  const response = NextResponse.redirect(authorize);
  const secure = requestIsSecure(request);
  response.headers.append("Set-Cookie", cookie("gr_google_state", state, secure));
  response.headers.append("Set-Cookie", cookie("gr_google_verifier", verifier, secure));
  response.headers.append("Set-Cookie", cookie("gr_google_next", safeNext(url.searchParams.get("next")), secure));
  return response;
}

function cookie(name: string, value: string, secure: boolean): string {
  return `${name}=${encodeURIComponent(value)}; Max-Age=600; ${googleCookieFlags(secure)}`;
}
