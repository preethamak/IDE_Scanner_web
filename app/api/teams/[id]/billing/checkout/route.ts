import { NextResponse } from "next/server";
import { authenticated } from "@/lib/auth";
import { BillingConfigurationError, siteUrl, stripeClient } from "@/lib/billing";
import { serviceDb } from "@/lib/supabase";
import { teamApiError } from "@/lib/teamApiError";
import { requireTeamRole } from "@/lib/teams";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const { user } = await authenticated(request);
    const { id } = await context.params;
    await requireTeamRole(id, user.id, ["owner"]);
    const price = process.env.STRIPE_TEAM_PRICE_ID;
    if (!price) throw new BillingConfigurationError();
    const db = serviceDb();
    const { data, error } = await db.from("workspace_subscriptions").select("provider_customer_id").eq("team_id", id).maybeSingle();
    if (error) throw error;
    const origin = siteUrl(request);
    const session = await stripeClient().checkout.sessions.create({
      mode: "subscription",
      customer: data?.provider_customer_id || undefined,
      customer_email: data?.provider_customer_id ? undefined : user.email,
      client_reference_id: id,
      line_items: [{ price, quantity: 1 }],
      subscription_data: { metadata: { team_id: id } },
      metadata: { team_id: id },
      success_url: `${origin}/workspace?billing=success`,
      cancel_url: `${origin}/workspace?billing=canceled`,
      allow_promotion_codes: true,
    });
    if (!session.url) throw new Error("Checkout did not return a destination.");
    return NextResponse.json({ url: session.url });
  } catch (error) {
    const failure = error instanceof BillingConfigurationError
      ? { status: 503, error: error.message }
      : teamApiError(error, "Checkout could not be started.");
    return NextResponse.json({ error: failure.error }, { status: failure.status });
  }
}
