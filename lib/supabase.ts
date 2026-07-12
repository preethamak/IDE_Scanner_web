import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export function hasSupabase(): boolean {
  return Boolean(url && anonKey);
}

export function publicDb(): SupabaseClient | null {
  return hasSupabase() ? createClient(url, anonKey, { auth: { persistSession: false } }) : null;
}

export function serviceDb(): SupabaseClient {
  if (!url || !serviceKey) throw new Error("Supabase service credentials are not configured.");
  return createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function userDb(accessToken: string): SupabaseClient {
  if (!url || !anonKey) throw new Error("Supabase is not configured.");
  return createClient(url, anonKey, { global: { headers: { Authorization: `Bearer ${accessToken}` } }, auth: { persistSession: false } });
}

export function browserDb(): SupabaseClient | null {
  if (typeof window === "undefined" || !hasSupabase()) return null;
  return createClient(url, anonKey);
}
