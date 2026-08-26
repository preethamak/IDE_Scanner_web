import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseConfig } from "@/lib/supabase";

export function hasSession(request: NextRequest) {
  return request.cookies.getAll().some((cookie) => cookie.name.startsWith("sb-"));
}

export async function refreshSession(request: NextRequest) {
  if (!hasSession(request)) return NextResponse.next({ request });
  let response = NextResponse.next({ request });
  const db = createServerClient(supabaseConfig.url, supabaseConfig.publishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(values, headers) {
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        values.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });
  await db.auth.getClaims();
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
