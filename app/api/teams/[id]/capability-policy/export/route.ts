import { authenticated } from "@/lib/auth";
import { getWorkspaceState } from "@/lib/cloudflareWorkspace";
import { buildCapabilityPolicyExport } from "@/lib/capabilityPolicyBundle";
import { graphWithWorkspaceExtensions } from "@/lib/teamCapabilityInventory";
import { requireTeamRole } from "@/lib/teams";
import { teamApiError } from "@/lib/teamApiError";
import { NextResponse } from "next/server";

type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, context: Context) {
  try {
    const { user, provider } = await authenticated(request); const { id } = await context.params;
    await requireTeamRole(id, user.id, ["owner", "admin", "analyst", "viewer"]);
    if (provider !== "cloudflare") return NextResponse.json({ error: "Capability policy storage is being rolled out to this workspace provider." }, { status: 503 });
    const state = await getWorkspaceState(id);
    const policy = state.capability_policy || { schema: "guardrails.capability-policy.v1" as const, version: 0, grants: [], updated_at: "", updated_by: "" };
    const graph = graphWithWorkspaceExtensions(id, state.inventory.installations, state.capability_graph);
    const exported = buildCapabilityPolicyExport(policy, graph);
    return new Response(`${JSON.stringify(exported, null, 2)}\n`, { headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": "attachment; filename=guardrails-capability-policy.json", "Cache-Control": "private, no-store", "X-GuardRails-Policy-Hash": exported.policy_hash } });
  } catch (error) { const failure = teamApiError(error, "Capability policy export is temporarily unavailable."); return NextResponse.json({ error: failure.error }, { status: failure.status }); }
}
