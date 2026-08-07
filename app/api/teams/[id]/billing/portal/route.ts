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
    const { data, error } = await serviceDb().from("workspace_subscriptions").select("provider_customer_id").eq("team_id", id).maybeSingle();
    if (error) throw error;
    if (!data?.provider_customer_id) return NextResponse.json({ error: "This workspace does not have a billing account yet." }, { status: 409 });
    const session = await stripeClient().billingPortal.sessions.create({ customer: data.provider_customer_id, return_url: `${siteUrl(request)}/workspace` });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    const failure = error instanceof BillingConfigurationError
      ? { status: 503, error: error.message }
      : teamApiError(error, "The billing portal could not be opened.");
    return NextResponse.json({ error: failure.error }, { status: failure.status });
  }
}
