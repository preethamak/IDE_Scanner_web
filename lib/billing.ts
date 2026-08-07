import Stripe from "stripe";

export function stripeClient() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new BillingConfigurationError();
  return new Stripe(key);
}

export function siteUrl(request?: Request) {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (configured) return configured;
  return request ? new URL(request.url).origin : "http://localhost:8765";
}

export class BillingConfigurationError extends Error {
  constructor() { super("Billing is not configured for this deployment."); this.name = "BillingConfigurationError"; }
}
