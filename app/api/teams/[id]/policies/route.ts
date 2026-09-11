import { NextResponse } from "next/server";
import { authenticated } from "@/lib/auth";
import { teamApiError } from "@/lib/teamApiError";
import { requireTeamRole } from "@/lib/teams";
import { serviceDb } from "@/lib/supabase";
import { getWorkspaceState, saveState } from "@/lib/cloudflareWorkspace";
import { newId, nowIso } from "@/lib/cloudflarePrivate";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };

const CAPABILITIES = ["terminal", "network", "filesystem", "credentials", "any"] as const;
const ACTIONS = ["allow", "review", "block"] as const;

export async function GET(request: Request, context: Context) {
  try {
    const { user, provider } = await authenticated(request);
    const { id } = await context.params;
    await requireTeamRole(id, user.id, ["owner", "admin", "analyst", "viewer"]);
    if (provider === "cloudflare") return NextResponse.json({ policies: (await getWorkspaceState(id)).policies }, { headers: { "Cache-Control": "private, no-store" } });
    const db = serviceDb();
    const { data, error } = await db
      .from("team_policies")
      .select("id,name,capability,action,applies_to,enabled,created_at")
      .eq("team_id", id)
      .order("created_at");
    if (error) throw error;
    return NextResponse.json(
      { policies: data || [] },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    const failure = teamApiError(error, "Workspace policies are temporarily unavailable.");
    return NextResponse.json({ error: failure.error }, { status: failure.status });
  }
}

export async function POST(request: Request, context: Context) {
  try {
    const { user, provider } = await authenticated(request);
    const { id } = await context.params;
    await requireTeamRole(id, user.id, ["owner", "admin"]);
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const name = String(body.name || "").trim();
    const capability = String(body.capability || "").trim();
    const action = String(body.action || "").trim();
    const appliesTo = body.applies_to === "all" ? "all" : "watchlist";
    if (!name || name.length > 120) {
      return NextResponse.json({ error: "Policy name must be between 1 and 120 characters." }, { status: 400 });
    }
    if (!CAPABILITIES.includes(capability as (typeof CAPABILITIES)[number])) {
      return NextResponse.json({ error: "Capability must be one of: " + CAPABILITIES.join(", ") + "." }, { status: 400 });
    }
    if (!ACTIONS.includes(action as (typeof ACTIONS)[number])) {
      return NextResponse.json({ error: "Action must be one of: " + ACTIONS.join(", ") + "." }, { status: 400 });
    }
    if (provider === "cloudflare") {
      const state = await getWorkspaceState(id);
      const now = nowIso();
      const existing = state.policies.find((policy) => String(policy.capability) === capability);
      const policy = existing || { id: newId(), created_at: now, created_by: user.id };
      Object.assign(policy, { team_id: id, name, capability, action, applies_to: appliesTo, enabled: true, updated_at: now });
      state.policies = [policy, ...state.policies.filter((item) => item !== existing)];
      await saveState(id, state);
      return NextResponse.json({ policy }, { status: existing ? 200 : 201 });
    }
    const db = serviceDb();
    const { data, error } = await db
      .from("team_policies")
      .upsert(
        { team_id: id, name, capability, action, applies_to: appliesTo, enabled: true, created_by: user.id },
        { onConflict: "team_id,capability" },
      )
      .select("id,name,capability,action,applies_to,enabled,created_at")
      .single();
    if (error) throw error;
    return NextResponse.json({ policy: data }, { status: 201 });
  } catch (error) {
    const failure = teamApiError(error, "Workspace policies are temporarily unavailable.");
    return NextResponse.json({ error: failure.error }, { status: failure.status });
  }
}

export async function PATCH(request: Request, context: Context) {
  try {
    const { user, provider } = await authenticated(request);
    const { id } = await context.params;
    await requireTeamRole(id, user.id, ["owner", "admin"]);
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const policyId = String(body.policy_id || "");
    if (!policyId) return NextResponse.json({ error: "policy_id is required." }, { status: 400 });
    if (provider === "cloudflare") {
      const state = await getWorkspaceState(id);
      const policy = state.policies.find((item) => String(item.id) === policyId);
      if (!policy) return NextResponse.json({ error: "Policy not found in this workspace." }, { status: 404 });
      policy.enabled = Boolean(body.enabled);
      policy.updated_at = nowIso();
      await saveState(id, state);
      return NextResponse.json({ policy });
    }
    const db = serviceDb();
    const { data, error } = await db
      .from("team_policies")
      .update({ enabled: Boolean(body.enabled) })
      .eq("team_id", id)
      .eq("id", policyId)
      .select("id,name,capability,action,applies_to,enabled,created_at")
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Policy not found in this workspace." }, { status: 404 });
    return NextResponse.json({ policy: data });
  } catch (error) {
    const failure = teamApiError(error, "Workspace policies are temporarily unavailable.");
    return NextResponse.json({ error: failure.error }, { status: failure.status });
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    const { user, provider } = await authenticated(request);
    const { id } = await context.params;
    await requireTeamRole(id, user.id, ["owner", "admin"]);
    const url = new URL(request.url);
    const policyId = url.searchParams.get("policy_id") || "";
    if (!policyId) return NextResponse.json({ error: "policy_id is required." }, { status: 400 });
    if (provider === "cloudflare") {
      const state = await getWorkspaceState(id);
      const before = state.policies.length;
      state.policies = state.policies.filter((item) => String(item.id) !== policyId);
      if (before === state.policies.length) return NextResponse.json({ error: "Policy not found in this workspace." }, { status: 404 });
      await saveState(id, state);
      return NextResponse.json({ removed: 1 });
    }
    const db = serviceDb();
    const { error, count } = await db
      .from("team_policies")
      .delete({ count: "exact" })
      .eq("team_id", id)
      .eq("id", policyId);
    if (error) throw error;
    if (!count) return NextResponse.json({ error: "Policy not found in this workspace." }, { status: 404 });
    return NextResponse.json({ removed: count });
  } catch (error) {
    const failure = teamApiError(error, "Workspace policies are temporarily unavailable.");
    return NextResponse.json({ error: failure.error }, { status: failure.status });
  }
}
