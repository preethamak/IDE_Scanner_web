import { NextResponse } from "next/server";
import { authenticated } from "@/lib/auth";
import { getWorkspaceState } from "@/lib/cloudflareWorkspace";
import { CapabilityPolicyValidationError, parseCapabilityPolicy, simulateCapabilityPolicy } from "@/lib/capabilityPolicyBundle";
import { graphWithWorkspaceExtensions } from "@/lib/teamCapabilityInventory";
import { requireTeamRole } from "@/lib/teams";
import { teamApiError } from "@/lib/teamApiError";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const { user, provider } = await authenticated(request);
    const { id } = await context.params;
    await requireTeamRole(id, user.id, ["owner", "admin", "analyst"]);
    if (provider !== "cloudflare") return NextResponse.json({ error: "Capability policy simulation is being rolled out to this workspace provider." }, { status: 503 });
    const state = await getWorkspaceState(id);
    const current = state.capability_policy || { schema: "guardrails.capability-policy.v1" as const, version: 0, grants: [], updated_at: "", updated_by: "" };
    const candidate = parseCapabilityPolicy(await request.json().catch(() => null), id, user.id, current.version);
    const graph = graphWithWorkspaceExtensions(id, state.inventory.installations, state.capability_graph);
    return NextResponse.json({ simulation: simulateCapabilityPolicy(candidate, current, graph) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof CapabilityPolicyValidationError) return NextResponse.json({ error: error.message }, { status: 400 });
    const failure = teamApiError(error, "Capability policy simulation is temporarily unavailable.");
    return NextResponse.json({ error: failure.error }, { status: failure.status });
  }
}
