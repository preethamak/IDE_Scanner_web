export const planIds = ["free", "team", "business"] as const;
export type PlanId = (typeof planIds)[number];

export const entitlementKeys = [
  "monitored_extensions",
  "team_members",
  "notification_channels",
  "audit_retention_days",
  "audit_export",
] as const;
export type EntitlementKey = (typeof entitlementKeys)[number];

export type PlanDefinition = {
  id: PlanId;
  name: string;
  limits: Record<Exclude<EntitlementKey, "audit_export">, number | null>;
  auditExport: boolean;
};

export const plans: Record<PlanId, PlanDefinition> = {
  free: {
    id: "free",
    name: "Free",
    limits: { monitored_extensions: 3, team_members: 2, notification_channels: 1, audit_retention_days: 30 },
    auditExport: false,
  },
  team: {
    id: "team",
    name: "Team",
    limits: { monitored_extensions: 50, team_members: 15, notification_channels: 5, audit_retention_days: 365 },
    auditExport: true,
  },
  business: {
    id: "business",
    name: "Business",
    limits: { monitored_extensions: null, team_members: null, notification_channels: null, audit_retention_days: 730 },
    auditExport: true,
  },
};

export function planId(value: unknown): PlanId {
  return planIds.includes(value as PlanId) ? value as PlanId : "free";
}

export function planForPrice(priceId: string | null | undefined): PlanId | null {
  if (!priceId) return null;
  if (priceId === process.env.STRIPE_TEAM_PRICE_ID) return "team";
  if (priceId === process.env.STRIPE_BUSINESS_PRICE_ID) return "business";
  return null;
}
