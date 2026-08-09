import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { planForPrice } from "@/lib/plans";
import { stripeClient } from "@/lib/billing";
import { serviceDb } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret) return NextResponse.json({ error: "Billing webhook is not configured." }, { status: 503 });
  let event: Stripe.Event;
  try {
    event = stripeClient().webhooks.constructEvent(await request.text(), signature, secret);
  } catch {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 });
  }
  const db = serviceDb();
  const eventCreatedAt = new Date(event.created * 1000).toISOString();
  try {
    const claim = await db.rpc("claim_billing_webhook_event_v2", {
      event_id: event.id,
      event_name: event.type,
      event_created_at: eventCreatedAt,
    });
    if (claim.error) throw claim.error;
    if (claim.data === "processed") return NextResponse.json({ received: true, duplicate: true });
    if (claim.data === "busy") {
      return NextResponse.json(
        { error: "Billing event is already being reconciled." },
        { status: 503, headers: { "Retry-After": "30" } },
      );
    }
    if (claim.data !== "claimed") throw new Error("Billing event claim returned an invalid state.");
    if (event.type.startsWith("customer.subscription.")) await reconcileSubscription(event.data.object as Stripe.Subscription, eventCreatedAt);
    if (event.type === "checkout.session.completed") await reconcileCheckout(event.data.object as Stripe.Checkout.Session);
    const finished = await db.rpc("finish_billing_webhook_event", { event_id: event.id, succeeded: true, failure_message: null });
    if (finished.error) throw finished.error;
    return NextResponse.json({ received: true, duplicate: false });
  } catch (error) {
    await db.rpc("finish_billing_webhook_event", {
      event_id: event.id,
      succeeded: false,
      failure_message: error instanceof Error ? error.message : "Billing reconciliation failed.",
    });
    return NextResponse.json({ error: "Billing event could not be reconciled." }, { status: 500 });
  }
}

async function reconcileCheckout(session: Stripe.Checkout.Session) {
  const teamId = session.metadata?.team_id || session.client_reference_id;
  if (!teamId || !session.customer) return;
  const { error } = await serviceDb().from("workspace_subscriptions").upsert({ team_id: teamId, provider_customer_id: String(session.customer), updated_at: new Date().toISOString() }, { onConflict: "team_id" });
  if (error) throw error;
}

async function reconcileSubscription(subscription: Stripe.Subscription, eventCreatedAt: string) {
  const stripe = stripeClient();
  const customer = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  let teamId = subscription.metadata.team_id;
  if (!teamId) {
    const result = await serviceDb().from("workspace_subscriptions").select("team_id").eq("provider_customer_id", customer).maybeSingle();
    if (result.error) throw result.error;
    teamId = result.data?.team_id;
  }
  if (!teamId) {
    const customerRecord = await stripe.customers.retrieve(customer);
    if (!customerRecord.deleted) teamId = customerRecord.metadata.team_id;
  }
  if (!teamId) throw new Error("Subscription is not bound to a workspace.");
  const current = await serviceDb().from("workspace_subscriptions").select("provider_updated_at").eq("team_id", teamId).maybeSingle();
  if (current.error) throw current.error;
  if (current.data?.provider_updated_at && new Date(current.data.provider_updated_at) >= new Date(eventCreatedAt)) return;
  const item = subscription.items.data[0];
  const status = normalizeStatus(subscription.status);
  const periodStart = item?.current_period_start;
  const periodEnd = item?.current_period_end;
  const { error } = await serviceDb().from("workspace_subscriptions").upsert({
    team_id: teamId,
    plan_id: planForPrice(item?.price.id) || "free",
    status,
    provider_customer_id: customer,
    provider_subscription_id: subscription.id,
    trial_ends_at: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
    current_period_starts_at: periodStart ? new Date(periodStart * 1000).toISOString() : null,
    current_period_ends_at: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    cancel_at_period_end: subscription.cancel_at_period_end,
    provider_updated_at: eventCreatedAt,
    updated_at: new Date().toISOString(),
  }, { onConflict: "team_id" });
  if (error) throw error;
}

function normalizeStatus(status: Stripe.Subscription.Status) {
  if (["trialing", "active", "past_due", "canceled", "incomplete", "unpaid"].includes(status)) return status;
  return "incomplete";
}
