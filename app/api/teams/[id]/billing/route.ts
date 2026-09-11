import { NextResponse } from "next/server";
import { authenticated } from "@/lib/auth";
import { workspaceEntitlements } from "@/lib/entitlements";
import { teamApiError } from "@/lib/teamApiError";
import { requireTeamRole } from "@/lib/teams";
import { getWorkspaceState } from "@/lib/cloudflareWorkspace";
import { plans } from "@/lib/plans";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  try {
    const { user, provider } = await authenticated(request);
    const { id } = await context.params;
    const role = await requireTeamRole(id, user.id, ["owner", "admin", "analyst", "viewer"]);
    if (provider === "cloudflare") {
      const state = await getWorkspaceState(id);
      const limits = plans.free.limits;
      return NextResponse.json({ plan: "free", planName: plans.free.name, status: "free", trialEndsAt: null, currentPeriodEndsAt: null, cancelAtPeriodEnd: false, usage: { monitored_extensions: state.watchlist.length, team_members: state.members.length, notification_channels: state.channels.length }, limits, auditExport: false, billingConfigured: false, canManageBilling: role === "owner" }, { headers: { "Cache-Control": "private, no-store" } });
    }
    return NextResponse.json({ ...(await workspaceEntitlements(id)), canManageBilling: role === "owner" }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const failure = teamApiError(error, "Plan and usage are temporarily unavailable.");
    return NextResponse.json({ error: failure.error }, { status: failure.status });
  }
}
