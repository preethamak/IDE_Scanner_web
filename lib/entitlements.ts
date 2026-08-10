import { plans, planId, type EntitlementKey, type PlanId } from "@/lib/plans";
import { serviceDb } from "@/lib/supabase";

export const subscriptionStatuses = ["free", "trialing", "active", "past_due", "canceled", "incomplete", "unpaid"] as const;
export type SubscriptionStatus = (typeof subscriptionStatuses)[number];
export type WorkspaceUsage = { monitored_extensions: number; team_members: number; notification_channels: number };
export type WorkspaceEntitlements = {
  plan: PlanId;
  planName: string;
  status: SubscriptionStatus;
  trialEndsAt: string | null;
  currentPeriodEndsAt: string | null;
  cancelAtPeriodEnd: boolean;
  usage: WorkspaceUsage;
  limits: typeof plans.free.limits;
  auditExport: boolean;
  billingConfigured: boolean;
};

const paidStatuses = new Set<SubscriptionStatus>(["trialing", "active"]);

export function effectivePlan(input: { plan_id?: unknown; status?: unknown; trial_ends_at?: string | null }, now = new Date()): PlanId {
  const requested = planId(input.plan_id);
  const status = subscriptionStatus(input.status);
  if (!paidStatuses.has(status)) return "free";
  if (status === "trialing") {
    const trialEnd = input.trial_ends_at ? new Date(input.trial_ends_at) : null;
    if (!trialEnd || !Number.isFinite(trialEnd.getTime()) || trialEnd <= now) return "free";
  }
  return requested;
}

export function subscriptionStatus(value: unknown): SubscriptionStatus {
  return subscriptionStatuses.includes(value as SubscriptionStatus) ? value as SubscriptionStatus : "free";
}

export function evaluateEntitlement(summary: WorkspaceEntitlements, key: EntitlementKey, increment = 0) {
  if (key === "audit_export") return summary.auditExport
    ? { allowed: true as const }
    : { allowed: false as const, code: "ENTITLEMENT_REQUIRED", message: "Audit export is available on the Team plan." };
  if (key === "audit_retention_days") return { allowed: true as const, limit: summary.limits.audit_retention_days };
  const limit = summary.limits[key];
  const used = summary.usage[key];
  return limit === null || used + increment <= limit
    ? { allowed: true as const, limit, used }
    : { allowed: false as const, code: "PLAN_LIMIT_REACHED", limit, used, message: `${summary.planName} includes ${limit} ${key.replaceAll("_", " ")}. Remove one or upgrade before adding another.` };
}

export async function workspaceEntitlements(teamId: string): Promise<WorkspaceEntitlements> {
  const db = serviceDb();
  const [subscription, watches, members, channels] = await Promise.all([
    db.from("workspace_subscriptions").select("plan_id,status,trial_ends_at,current_period_ends_at,cancel_at_period_end").eq("team_id", teamId).maybeSingle(),
    db.from("team_watchlist_items").select("extension_id", { count: "exact", head: true }).eq("team_id", teamId),
    db.from("team_members").select("user_id", { count: "exact", head: true }).eq("team_id", teamId),
    db.from("team_notification_channels").select("id", { count: "exact", head: true }).eq("team_id", teamId),
  ]);
  const failed = [subscription, watches, members, channels].find((result) => result.error && result.error.code !== "PGRST116");
  if (failed?.error) throw failed.error;
  const row = (subscription.data || {}) as { plan_id?: string; status?: string; trial_ends_at?: string | null; current_period_ends_at?: string | null; cancel_at_period_end?: boolean };
  const selected = effectivePlan(row);
  const definition = plans[selected];
  return {
    plan: selected,
    planName: definition.name,
    status: subscriptionStatus(row.status),
    trialEndsAt: row.trial_ends_at || null,
    currentPeriodEndsAt: row.current_period_ends_at || null,
    cancelAtPeriodEnd: row.cancel_at_period_end === true,
    usage: { monitored_extensions: watches.count || 0, team_members: members.count || 0, notification_channels: channels.count || 0 },
    limits: definition.limits,
    auditExport: definition.auditExport,
    billingConfigured: billingConfigured(),
  };
}

export function billingConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET && process.env.STRIPE_TEAM_PRICE_ID);
}

export function auditRetentionCutoff(days: number | null, now = new Date()) {
  const fallback = plans.free.limits.audit_retention_days ?? 30;
  const safeDays = typeof days === "number" && Number.isFinite(days) ? Math.max(1, Math.floor(days)) : fallback;
  return new Date(now.getTime() - safeDays * 86_400_000).toISOString();
}

export class EntitlementError extends Error {
  status = 403;
  code: string;
  constructor(code: string, message: string) { super(message); this.name = "EntitlementError"; this.code = code; }
}

export async function requireEntitlement(teamId: string, key: EntitlementKey, increment = 0) {
  const result = evaluateEntitlement(await workspaceEntitlements(teamId), key, increment);
  if (!result.allowed) throw new EntitlementError(result.code, result.message);
  return result;
}
