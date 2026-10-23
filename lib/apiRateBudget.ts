import { serviceDb } from "@/lib/supabase";

export type ApiRateBudget = { allowed: boolean; remaining: number; retryAfter: number };

export function bulkGateRateLimit(plan: string): number {
  return plan === "enterprise" ? 300 : 60;
}

export async function consumeBulkGateBudget(keyId: string, plan: string): Promise<ApiRateBudget> {
  const { data, error } = await serviceDb().rpc("consume_api_key_rate_budget", {
    p_key_id: keyId,
    p_limit: bulkGateRateLimit(plan),
    p_window_seconds: 60,
  }).single();
  if (error) throw error;
  const row = (data || {}) as { allowed?: unknown; remaining?: unknown; retry_after?: unknown };
  return {
    allowed: Boolean(row.allowed),
    remaining: Number(row.remaining || 0),
    retryAfter: Math.max(1, Number(row.retry_after || 60)),
  };
}
