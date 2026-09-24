import { createHash, randomBytes } from "node:crypto";
import { serviceDb } from "@/lib/supabase";
import { runtimeEnv } from "@/lib/runtimeEnv";

export const GUEST_TRIAL_LIMIT = 5;
export const GUEST_TRIAL_WINDOW_DAYS = 30;
const GUEST_TRIAL_COOKIE = "gr_trial";

type TrialRow = {
  scan_count?: unknown;
  window_started_at?: unknown;
};

export type GuestTrialStatus = {
  available: boolean;
  remaining: number;
  limit: number;
  window_days: number;
};

export function guestTrialToken(request: Request): string {
  const cookies = request.headers.get("cookie") || "";
  const pair = cookies
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${GUEST_TRIAL_COOKIE}=`));
  return pair ? decodeURIComponent(pair.slice(GUEST_TRIAL_COOKIE.length + 1)) : "";
}

export function newGuestTrialToken(): string {
  return `gr_${randomBytes(32).toString("base64url")}`;
}

export function guestTrialCookie(token: string, request: Request): string {
  const forwarded = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const secure = new URL(request.url).protocol === "https:" || forwarded === "https";
  return `${GUEST_TRIAL_COOKIE}=${encodeURIComponent(token)}; Max-Age=${GUEST_TRIAL_WINDOW_DAYS * 24 * 60 * 60}; Path=/; HttpOnly;${secure ? " Secure;" : ""} SameSite=Lax`;
}

export function guestTrialKey(request: Request): string {
  const address =
    request.headers.get("cf-connecting-ip")?.trim() ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown";
  const secret = runtimeEnv("SCAN_RATE_LIMIT_SECRET") || "ide-scanner";
  return createHash("sha256").update(`${secret}:${address}`).digest("hex");
}

export function guestTrialTokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function supabaseGuestTrialStatus(
  request: Request,
): Promise<GuestTrialStatus> {
  const result = await serviceDb()
    .from("guest_deep_scan_trials")
    .select("scan_count,window_started_at")
    .eq("trial_key", guestTrialKey(request))
    .maybeSingle<TrialRow>();
  if (result.error) throw result.error;
  const row = result.data;
  const started = row?.window_started_at
    ? Date.parse(String(row.window_started_at))
    : NaN;
  const expired = !Number.isFinite(started) || Date.now() - started >= GUEST_TRIAL_WINDOW_DAYS * 86_400_000;
  const used = expired ? 0 : Number(row?.scan_count || 0);
  return {
    available: used < GUEST_TRIAL_LIMIT,
    remaining: Math.max(0, GUEST_TRIAL_LIMIT - used),
    limit: GUEST_TRIAL_LIMIT,
    window_days: GUEST_TRIAL_WINDOW_DAYS,
  };
}

export async function consumeSupabaseGuestTrial(
  request: Request,
): Promise<GuestTrialStatus> {
  const result = await serviceDb().rpc("consume_guest_deep_scan_trial", {
    p_trial_key: guestTrialKey(request),
    p_limit: GUEST_TRIAL_LIMIT,
    p_window_days: GUEST_TRIAL_WINDOW_DAYS,
  });
  if (result.error) throw result.error;
  const remaining = Number(
    Array.isArray(result.data) ? result.data[0] : result.data,
  );
  if (!Number.isFinite(remaining)) throw new Error("Guest trial response was invalid.");
  if (remaining < 0) {
    const error = new Error(
      "Your five free scans are used up. Create a free GuardRails workspace to keep scanning and save your history.",
    );
    error.name = "GuestTrialLimitError";
    throw error;
  }
  return {
    available: remaining > 0,
    remaining: Math.max(0, remaining),
    limit: GUEST_TRIAL_LIMIT,
    window_days: GUEST_TRIAL_WINDOW_DAYS,
  };
}

export async function getSupabaseGuestJobForRelease(
  extensionId: string,
  version: string,
  request: Request,
): Promise<Record<string, unknown> | null> {
  const access = await serviceDb()
    .from("guest_deep_scan_access")
    .select("job_id")
    .eq("token_hash", guestTrialTokenHash(guestTrialToken(request)))
    .eq("trial_key", guestTrialKey(request))
    .maybeSingle<{ job_id?: unknown }>();
  if (access.error) throw access.error;
  if (!access.data?.job_id) return null;
  const job = await serviceDb()
    .from("scan_jobs")
    .select("*")
    .eq("id", String(access.data.job_id))
    .eq("extension_id", extensionId)
    .eq("version", version)
    .maybeSingle<Record<string, unknown>>();
  if (job.error) throw job.error;
  return job.data || null;
}

export async function getSupabaseGuestJob(
  jobId: string,
  request: Request,
): Promise<Record<string, unknown> | null> {
  const access = await serviceDb()
    .from("guest_deep_scan_access")
    .select("job_id")
    .eq("job_id", jobId)
    .eq("token_hash", guestTrialTokenHash(guestTrialToken(request)))
    .eq("trial_key", guestTrialKey(request))
    .maybeSingle<{ job_id?: unknown }>();
  if (access.error) throw access.error;
  if (!access.data?.job_id) return null;
  const job = await serviceDb()
    .from("scan_jobs")
    .select("*")
    .eq("id", jobId)
    .maybeSingle<Record<string, unknown>>();
  if (job.error) throw job.error;
  return job.data || null;
}
