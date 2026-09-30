import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseConfig } from "@/lib/supabase";
import { runtimeEnv } from "@/lib/runtimeEnv";

function serverConfig() {
  return {
    url: runtimeEnv("NEXT_PUBLIC_SUPABASE_URL") || supabaseConfig.url,
    publishableKey:
      runtimeEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") ||
      runtimeEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY") ||
      supabaseConfig.publishableKey,
  };
}

export async function serverDb() {
  const store = await cookies();
  const config = serverConfig();
  if (!config.url || !config.publishableKey) {
    throw new Error("Supabase is not configured.");
  }
  return createServerClient(config.url, config.publishableKey, {
    cookies: {
      getAll: () => store.getAll(),
      setAll(values) {
        try { values.forEach(({ name, value, options }) => store.set(name, value, options)); }
        catch { /* Session refresh is completed by proxy for Server Components. */ }
      },
    },
  });
}
