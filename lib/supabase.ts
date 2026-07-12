import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://kmdujtabqaxgoeltbxpq.supabase.co";
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_SFVIp0jbZBldUWVKHdwXBQ_ZQEvM_gS";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export function hasSupabase(): boolean {
  return Boolean(url && publishableKey);
}

export function publicDb(): SupabaseClient | null {
  return hasSupabase() ? createClient(url, publishableKey, { auth: { persistSession: false } }) : null;
}

export function serviceDb(): SupabaseClient {
  if (!url || !serviceKey) throw new Error("Supabase service credentials are not configured.");
  return createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function userDb(accessToken: string): SupabaseClient {
  if (!url || !publishableKey) throw new Error("Supabase is not configured.");
  return createClient(url, publishableKey, { global: { headers: { Authorization: `Bearer ${accessToken}` } }, auth: { persistSession: false } });
}

export function browserDb(): SupabaseClient | null {
  if (typeof window === "undefined" || !hasSupabase()) return null;
  return createClient(url, publishableKey);
}
