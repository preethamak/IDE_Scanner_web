import { describe, expect, it } from "vitest";
import { auditRetentionCutoff, effectivePlan, evaluateEntitlement, type WorkspaceEntitlements } from "@/lib/entitlements";
import { plans } from "@/lib/plans";

function summary(overrides: Partial<WorkspaceEntitlements> = {}): WorkspaceEntitlements {
  return { plan: "free", planName: "Free", status: "free", trialEndsAt: null, currentPeriodEndsAt: null, cancelAtPeriodEnd: false, usage: { monitored_extensions: 3, team_members: 1, notification_channels: 0 }, limits: plans.free.limits, auditExport: false, billingConfigured: false, ...overrides };
}

describe("workspace entitlement contract", () => {
  it("falls back to free for stale, failed, and expired paid state", () => {
    expect(effectivePlan({ plan_id: "team", status: "past_due" })).toBe("free");
    expect(effectivePlan({ plan_id: "team", status: "trialing", trial_ends_at: "2026-01-01T00:00:00Z" }, new Date("2026-08-07T00:00:00Z"))).toBe("free");
    expect(effectivePlan({ plan_id: "team", status: "trialing", trial_ends_at: "not-a-date" }, new Date("2026-08-07T00:00:00Z"))).toBe("free");
    expect(effectivePlan({ plan_id: "team", status: "active" })).toBe("team");
  });

  it("denies a direct resource mutation when it would cross a plan limit", () => {
    expect(evaluateEntitlement(summary(), "monitored_extensions", 1)).toMatchObject({ allowed: false, code: "PLAN_LIMIT_REACHED", limit: 3, used: 3 });
    expect(evaluateEntitlement(summary({ usage: { monitored_extensions: 2, team_members: 1, notification_channels: 0 } }), "monitored_extensions", 1)).toMatchObject({ allowed: true });
  });

  it("keeps export as an independently enforced entitlement", () => {
    expect(evaluateEntitlement(summary(), "audit_export")).toMatchObject({ allowed: false, code: "ENTITLEMENT_REQUIRED" });
    expect(evaluateEntitlement(summary({ plan: "team", planName: "Team", limits: plans.team.limits, auditExport: true }), "audit_export")).toEqual({ allowed: true });
  });

  it("creates a stable plan-bound audit-history cutoff", () => {
    const now = new Date("2026-08-09T00:00:00.000Z");
    expect(auditRetentionCutoff(30, now)).toBe("2026-07-10T00:00:00.000Z");
    expect(auditRetentionCutoff(Number.NaN, now)).toBe("2026-07-10T00:00:00.000Z");
  });
});
