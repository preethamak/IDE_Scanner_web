import "server-only";

import { runtimeEnv } from "@/lib/runtimeEnv";

export function googleRedirectUri(url: URL, requestOrigin?: string): string {
  const local = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  if (local) return `${requestOrigin || url.origin}/api/auth/callback/google`;
  return (
    runtimeEnv("GOOGLE_OAUTH_REDIRECT_URI").trim() ||
    `${url.origin}/api/auth/callback/google`
  );
}

export function googleCookieFlags(secure: boolean): string {
  return `Path=/; HttpOnly;${secure ? " Secure;" : ""} SameSite=Lax`;
}
