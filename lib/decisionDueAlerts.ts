import type { SupabaseClient } from "@supabase/supabase-js";

export async function queueDecisionDueAlerts(db: Pick<SupabaseClient, "rpc">, now: string): Promise<{ queued: number; error: string }> {
  const { data, error } = await db.rpc("queue_team_decision_due_alerts", { target_now: now });
  return error ? { queued: 0, error: error.message } : { queued: Number(data || 0), error: "" };
}
