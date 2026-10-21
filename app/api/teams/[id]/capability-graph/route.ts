import { NextResponse } from "next/server";
import { authenticated } from "@/lib/auth";
import { getWorkspaceState, saveState } from "@/lib/cloudflareWorkspace";
import { graphWithWorkspaceExtensions, parseCapabilityGraphImport, CapabilityInventoryValidationError } from "@/lib/teamCapabilityInventory";
import { requireTeamRole } from "@/lib/teams";
import { teamApiError } from "@/lib/teamApiError";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  try {
    const { user, provider } = await authenticated(request);
    const { id } = await context.params;
    await requireTeamRole(id, user.id, ["owner", "admin", "analyst", "viewer"]);
    if (provider !== "cloudflare") return NextResponse.json({ error: "Capability graph storage is being rolled out to this workspace provider." }, { status: 503 });
    const state = await getWorkspaceState(id);
    const graph = graphWithWorkspaceExtensions(id, state.inventory.installations, state.capability_graph);
    return NextResponse.json({ graph, summary: summarize(graph) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const failure = teamApiError(error, "Capability graph is temporarily unavailable.");
    return NextResponse.json({ error: failure.error }, { status: failure.status });
  }
}

export async function POST(request: Request, context: Context) {
  try {
    const { user, provider } = await authenticated(request);
    const { id } = await context.params;
    await requireTeamRole(id, user.id, ["owner", "admin", "analyst"]);
    if (provider !== "cloudflare") return NextResponse.json({ error: "Capability graph storage is being rolled out to this workspace provider." }, { status: 503 });
    const graph = parseCapabilityGraphImport(await request.json().catch(() => null), id);
    const state = await getWorkspaceState(id);
    state.capability_graph = graph;
    state.audit.unshift({ event_id: crypto.randomUUID(), workspace_id: id, actor_id: user.id, action: "capability_graph_imported", object_type: "capability_graph", object_id: graph.generatedAt, previous_state: null, resulting_state: { subjects: graph.subjects.length, relationships: graph.relationships.length }, rationale: null, risk_level: null, receipt_id: crypto.randomUUID(), occurred_at: new Date().toISOString() });
    state.audit = state.audit.slice(0, 500);
    await saveState(id, state);
    return NextResponse.json({ graph, summary: summarize(graph) }, { status: 201 });
  } catch (error) {
    if (error instanceof CapabilityInventoryValidationError) return NextResponse.json({ error: error.message }, { status: 400 });
    const failure = teamApiError(error, "Capability graph could not be imported.");
    return NextResponse.json({ error: failure.error }, { status: failure.status });
  }
}

function summarize(graph: { subjects: ReadonlyArray<{ kind: string; evidenceState: string; capabilities: readonly string[] }> }) {
  const byKind = Object.fromEntries(["extension", "mcp_server", "agent_skill", "cli", "browser_extension"].map((kind) => [kind, graph.subjects.filter((subject) => subject.kind === kind).length]));
  return { subjects: graph.subjects.length, by_kind: byKind, verified: graph.subjects.filter((subject) => subject.evidenceState === "verified").length, unknown_capabilities: graph.subjects.filter((subject) => subject.capabilities.length === 0).length };
}
