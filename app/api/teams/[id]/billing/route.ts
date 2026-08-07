import { NextResponse } from "next/server";
import { authenticated } from "@/lib/auth";
import { workspaceEntitlements } from "@/lib/entitlements";
import { teamApiError } from "@/lib/teamApiError";
import { requireTeamRole } from "@/lib/teams";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  try {
    const { user } = await authenticated(request);
    const { id } = await context.params;
    const role = await requireTeamRole(id, user.id, ["owner", "admin", "analyst", "viewer"]);
    return NextResponse.json({ ...(await workspaceEntitlements(id)), canManageBilling: role === "owner" }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const failure = teamApiError(error, "Plan and usage are temporarily unavailable.");
    return NextResponse.json({ error: failure.error }, { status: failure.status });
  }
}
