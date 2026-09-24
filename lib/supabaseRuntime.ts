import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { runtimeEnv } from "@/lib/runtimeEnv";

export function runtimeSupabase(): SupabaseClient | null {
  const url = runtimeEnv("NEXT_PUBLIC_SUPABASE_URL").trim();
  const key = (
    runtimeEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") ||
    runtimeEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
  ).trim();
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Server-side Supabase access for runtimes where secrets are injected at
 * request time (for example, a Cloudflare Worker). The legacy `serviceDb`
 * helper intentionally reads process.env for the Node runtime, which is not
 * populated with Wrangler secrets after deployment.
 */
export function runtimeServiceDb(): SupabaseClient | null {
  const url = runtimeEnv("NEXT_PUBLIC_SUPABASE_URL").trim();
  const key = (
    runtimeEnv("SUPABASE_SECRET_KEY") ||
    runtimeEnv("SUPABASE_SERVICE_ROLE_KEY")
  ).trim();
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
