import { NextResponse } from "next/server";
import { generateApiKey } from "@/lib/apiKeys";
import { authenticated } from "@/lib/auth";
import { teamApiError } from "@/lib/teamApiError";
import { requireTeamRole } from "@/lib/teams";
import { serviceDb } from "@/lib/supabase";
import { workspaceEntitlements } from "@/lib/entitlements";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };

const MAX_KEYS_PER_TEAM = 10;

export async function GET(request: Request, context: Context) {
  try {
    const { user } = await authenticated(request);
    const { id } = await context.params;
    await requireTeamRole(id, user.id, ["owner", "admin", "analyst", "viewer"]);
    const db = serviceDb();
    const { data, error } = await db
      .from("api_keys")
      .select("id,label,key_prefix,last_used_at,revoked_at,created_at")
      .eq("team_id", id)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json(
      { api_keys: data || [] },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    const failure = teamApiError(error, "API keys are temporarily unavailable.");
    return NextResponse.json({ error: failure.error }, { status: failure.status });
  }
}

export async function POST(request: Request, context: Context) {
  try {
    const { user } = await authenticated(request);
    const { id } = await context.params;
    await requireTeamRole(id, user.id, ["owner", "admin"]);

    const entitlements = await workspaceEntitlements(id);
    if (entitlements.plan === "free") {
      return NextResponse.json(
        { error: "API keys are available on the Team plan and above. Upgrade to generate one." },
        { status: 403, },
      );
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const label = String(body.label || "").trim();
    if (!label || label.length > 80) {
      return NextResponse.json({ error: "Key label must be between 1 and 80 characters." }, { status: 400 });
    }

    const db = serviceDb();
    const { count, error: countError } = await db
      .from("api_keys")
      .select("id", { count: "exact", head: true })
      .eq("team_id", id)
      .is("revoked_at", null);
    if (countError) throw countError;
    if ((count || 0) >= MAX_KEYS_PER_TEAM) {
      return NextResponse.json(
        { error: `This workspace already has ${MAX_KEYS_PER_TEAM} active API keys. Revoke one before creating another.` },
        { status: 403 },
      );
    }

    const { raw, prefix, hash } = generateApiKey();
    const { data, error } = await db
      .from("api_keys")
      .insert({ team_id: id, label, key_prefix: prefix, key_hash: hash, created_by: user.id })
      .select("id,label,key_prefix,created_at")
      .single();
    if (error) throw error;
    return NextResponse.json({ api_key: { ...data, key: raw } }, { status: 201 });
  } catch (error) {
    const failure = teamApiError(error, "API keys are temporarily unavailable.");
    return NextResponse.json({ error: failure.error }, { status: failure.status });
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    const { user } = await authenticated(request);
    const { id } = await context.params;
    await requireTeamRole(id, user.id, ["owner", "admin"]);
    const url = new URL(request.url);
    const keyId = url.searchParams.get("key_id") || "";
    if (!keyId) return NextResponse.json({ error: "key_id is required." }, { status: 400 });
    const db = serviceDb();
    const { data, error } = await db
      .from("api_keys")
      .update({ revoked_at: new Date().toISOString() })
      .eq("team_id", id)
      .eq("id", keyId)
      .is("revoked_at", null)
      .select("id")
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Active API key not found in this workspace." }, { status: 404 });
    return NextResponse.json({ revoked: true });
  } catch (error) {
    const failure = teamApiError(error, "API keys are temporarily unavailable.");
    return NextResponse.json({ error: failure.error }, { status: failure.status });
  }
}
